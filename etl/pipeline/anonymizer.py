"""
Anonymizer — transforma registros transaccionales en registros analíticos.

Principios aplicados:
  1. Eliminación de PII directos: user_id, email, teléfono
  2. Hash unidireccional de IDs (SHA-256, no reversible)
  3. Generalización geográfica: solo zone_id (no lat/lng exactas)
  4. Generalización temporal: solo fecha (no hora exacta)
  5. Eliminación de texto libre: title, description (portadores de PII potencial)
  6. Preservación de atributos estructurados: presupuesto, urgencia, conteos
  7. Respeto de consentimiento: excluir si consent_analytics != 'granted'
  8. Respeto del derecho al olvido: excluir si anonymized_at IS NOT NULL

Todo cambio a este módulo debe ser revisado bajo el principio de
privacy-by-design antes de ser desplegado.
"""

import hashlib
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from .logger import get_logger

log = get_logger(__name__)

URGENCY_SCORE: dict[str, int] = {
    'low':       1,
    'medium':    2,
    'high':      3,
    'immediate': 4,
}

# Campos que NUNCA deben aparecer en el output del anonymizer
_FORBIDDEN_FIELDS = frozenset({
    'user_id', 'buyer_id', 'seller_id',
    'email', 'phone', 'display_name', 'avatar_url', 'bio',
    'location_lat', 'location_lng', 'location_label',
    'title', 'description',
    'ip_address', 'user_agent',
})


@dataclass
class AnonymizedDemand:
    demand_hash:          str
    category_id:          int
    subcategory_id:       int | None
    zone_id:              int | None
    budget_min:           float | None
    budget_max:           float | None
    currency:             str
    urgency_score:        int
    tag_count:            int
    offers_received:      int
    time_to_first_offer_h: float | None
    time_to_close_h:      float | None
    was_transacted:       bool
    transaction_amount:   float | None
    seller_verified:      bool | None
    seller_avg_rating:    float | None
    demand_date:          date
    year:                 int
    quarter:              int
    month:                int
    week:                 int

    def as_tuple(self) -> tuple:
        """Para uso en execute_many."""
        return (
            self.demand_hash,
            self.category_id,
            self.subcategory_id,
            self.zone_id,
            self.budget_min,
            self.budget_max,
            self.currency,
            self.urgency_score,
            self.tag_count,
            self.offers_received,
            self.time_to_first_offer_h,
            self.time_to_close_h,
            self.was_transacted,
            self.transaction_amount,
            self.seller_verified,
            self.seller_avg_rating,
            self.demand_date,
            self.year,
            self.quarter,
            self.month,
            self.week,
        )


class AnonymizationError(Exception):
    pass


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def _assert_no_pii(record: dict[str, Any]) -> None:
    """Guarda de seguridad: falla ruidosamente si hay campos PII en el output."""
    leaked = _FORBIDDEN_FIELDS & set(record.keys())
    if leaked:
        raise AnonymizationError(f"PII fields detected in anonymized output: {leaked}")


def anonymize_demand(raw: dict[str, Any]) -> AnonymizedDemand | None:
    """
    Transforma un registro crudo de app.demands en un AnonymizedDemand.

    Devuelve None si el registro no debe incluirse en el warehouse:
      - usuario sin consentimiento analítico
      - usuario que ejerció derecho al olvido
      - demanda en estado draft (nunca publicada)
    """
    # Filtro de consentimiento — primera línea de defensa
    if raw.get('consent_analytics') != 'granted':
        return None

    # Filtro de derecho al olvido
    if raw.get('anonymized_at') is not None:
        return None

    # No incluir borradores
    if raw.get('status') == 'draft':
        return None

    demand_id = str(raw['id'])
    created_at: datetime = raw['created_at']

    # Calcular tiempos (pueden venir precalculados desde la query de extracción)
    time_to_first_offer_h: float | None = raw.get('time_to_first_offer_h')
    time_to_close_h: float | None = raw.get('time_to_close_h')

    # Calcular fecha ISO week
    iso_week = created_at.isocalendar()[1]
    quarter  = (created_at.month - 1) // 3 + 1

    result = AnonymizedDemand(
        demand_hash           = _sha256(demand_id),
        category_id           = int(raw['category_id']),
        subcategory_id        = int(raw['subcategory_id']) if raw.get('subcategory_id') else None,
        zone_id               = int(raw['zone_id']) if raw.get('zone_id') else None,
        budget_min            = float(raw['budget_min'])  if raw.get('budget_min')  else None,
        budget_max            = float(raw['budget_max'])  if raw.get('budget_max')  else None,
        currency              = str(raw.get('currency', 'GTQ')),
        urgency_score         = URGENCY_SCORE.get(str(raw.get('urgency', 'medium')), 2),
        tag_count             = int(raw.get('tag_count', 0)),
        offers_received       = int(raw.get('offer_count', 0)),
        time_to_first_offer_h = round(float(time_to_first_offer_h), 2) if time_to_first_offer_h is not None else None,
        time_to_close_h       = round(float(time_to_close_h), 2)       if time_to_close_h       is not None else None,
        was_transacted        = bool(raw.get('was_transacted', False)),
        transaction_amount    = float(raw['transaction_amount']) if raw.get('transaction_amount') else None,
        seller_verified       = bool(raw['seller_verified'])     if raw.get('seller_verified')   is not None else None,
        seller_avg_rating     = round(float(raw['seller_avg_rating']), 2) if raw.get('seller_avg_rating') else None,
        demand_date           = created_at.date(),
        year                  = created_at.year,
        quarter               = quarter,
        month                 = created_at.month,
        week                  = iso_week,
    )

    return result


def anonymize_batch(
    raw_records: list[dict[str, Any]],
) -> tuple[list[AnonymizedDemand], int, int]:
    """
    Procesa un batch de registros.

    Returns:
        (anonymized, skipped_consent, skipped_other)
    """
    anonymized: list[AnonymizedDemand] = []
    skipped_consent = 0
    skipped_other   = 0

    for raw in raw_records:
        try:
            result = anonymize_demand(raw)
            if result is None:
                if raw.get('consent_analytics') != 'granted' or raw.get('anonymized_at'):
                    skipped_consent += 1
                else:
                    skipped_other += 1
            else:
                anonymized.append(result)
        except AnonymizationError as e:
            log.error('anonymization_pii_leak', error=str(e), demand_id=str(raw.get('id', '?')))
            skipped_other += 1
        except Exception as e:
            log.warning('anonymization_error', error=str(e), demand_id=str(raw.get('id', '?')))
            skipped_other += 1

    return anonymized, skipped_consent, skipped_other
