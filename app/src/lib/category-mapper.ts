// Purpose-of-credit to demand category mapper

export interface MappedCategory {
  categoryId: number | null
  categoryName: string
  mappingType: 'direct' | 'related' | 'substitute' | 'operational'
  confidence: 'exact' | 'strong' | 'weak'
  reason: string
  included: boolean
}

interface PurposeMapping {
  keywords: string[]
  direct: Array<{ id: number | null; name: string; reason: string }>
  related: Array<{ id: number | null; name: string; reason: string }>
  substitute: Array<{ id: number | null; name: string; reason: string }>
  operational: Array<{ id: number | null; name: string; reason: string }>
}

const MAPPINGS: PurposeMapping[] = [
  {
    keywords: ['helado', 'helados', 'heladería', 'paleta', 'paletas', 'sorbete', 'nieves'],
    direct: [
      { id: 905, name: 'Helados y Postres Fríos', reason: 'Categoría principal del negocio' },
      { id: 906, name: 'Catering Dulce', reason: 'Categoría hermana directa' },
    ],
    related: [
      { id: 907, name: 'Bebidas Frías', reason: 'Canal de venta frecuente para helados' },
      { id: 908, name: 'Snacks y Dulces', reason: 'Producto complementario habitual' },
      { id: 209, name: 'Eventos', reason: 'Principal canal de venta de helados artesanales' },
      { id: 902, name: 'Catering', reason: 'Servicio de catering relacionado' },
    ],
    substitute: [
      { id: null, name: 'Repostería', reason: 'Sustituto en eventos y celebraciones' },
      { id: null, name: 'Jugos y bebidas', reason: 'Sustituto en temporadas de calor' },
    ],
    operational: [
      { id: null, name: 'Congeladores y refrigeración', reason: 'Equipo clave para el negocio' },
      { id: null, name: 'Empaques y utensilios', reason: 'Insumos operativos necesarios' },
    ],
  },
  {
    keywords: ['celular', 'celulares', 'smartphone', 'teléfono', 'móvil', 'pantalla', 'batería', 'reparación celular', 'técnico celular'],
    direct: [
      { id: 910, name: 'Reparación de celulares', reason: 'Categoría principal del negocio' },
      { id: 911, name: 'Accesorios de celular', reason: 'Producto complementario directo' },
    ],
    related: [
      { id: 702, name: 'Soporte Técnico', reason: 'Servicio técnico relacionado' },
      { id: null, name: 'Celulares usados', reason: 'Mercado relacionado habitual en talleres' },
      { id: null, name: 'Repuestos electrónicos', reason: 'Insumos operativos del taller' },
    ],
    substitute: [
      { id: null, name: 'Laptops y computadoras', reason: 'Sustituto tecnológico para servicios' },
      { id: null, name: 'Tablets', reason: 'Segmento de reparación cercano' },
    ],
    operational: [
      { id: null, name: 'Herramientas técnicas', reason: 'Equipamiento del taller' },
      { id: null, name: 'Repuestos importados', reason: 'Insumos para reparación' },
    ],
  },
  {
    keywords: ['pintura', 'pintar', 'pintor', 'remodelación', 'remodelar', 'acabados', 'fachada'],
    direct: [
      { id: 912, name: 'Pintura de casas', reason: 'Categoría principal del servicio' },
      { id: 913, name: 'Remodelación', reason: 'Servicio directamente relacionado' },
    ],
    related: [
      { id: 917, name: 'Carpintería', reason: 'Servicio complementario frecuente en remodelaciones' },
      { id: 207, name: 'Construcción', reason: 'Categoría de construcción relacionada' },
      { id: null, name: 'Impermeabilización', reason: 'Servicio relacionado de acabados' },
      { id: null, name: 'Piso y azulejo', reason: 'Servicio de remodelación frecuente' },
    ],
    substitute: [
      { id: null, name: 'Mantenimiento general', reason: 'Categoría amplia que incluye pintura' },
    ],
    operational: [
      { id: null, name: 'Materiales de construcción', reason: 'Insumos para el servicio' },
      { id: null, name: 'Andamios y herramientas', reason: 'Equipo necesario' },
    ],
  },
  {
    keywords: ['libro', 'libros', 'universitario', 'universidad', 'texto', 'textos', 'académico', 'estudio', 'librería'],
    direct: [
      { id: 914, name: 'Libros universitarios', reason: 'Categoría principal del negocio' },
      { id: 103, name: 'Libros y Papelería', reason: 'Categoría hermana directa' },
    ],
    related: [
      { id: null, name: 'Libros usados', reason: 'Mercado secundario relacionado muy activo' },
      { id: null, name: 'Material de oficina', reason: 'Producto complementario estudiantil' },
      { id: null, name: 'Computadoras portátiles', reason: 'Necesidad estudiantil relacionada' },
    ],
    substitute: [
      { id: null, name: 'Libros digitales', reason: 'Sustituto digital directo' },
      { id: null, name: 'Fotocopias y apuntes', reason: 'Sustituto económico habitual' },
    ],
    operational: [
      { id: null, name: 'Local o punto de venta', reason: 'Infraestructura necesaria' },
      { id: null, name: 'Transporte de mercancía', reason: 'Logística de distribución' },
    ],
  },
  {
    keywords: ['repuesto', 'repuestos', 'moto', 'motos', 'motocicleta', 'refacción', 'taller moto', 'mecánica moto'],
    direct: [
      { id: 915, name: 'Repuestos de moto', reason: 'Categoría principal del inventario' },
      { id: 916, name: 'Reparación de motos', reason: 'Servicio directamente relacionado' },
    ],
    related: [
      { id: null, name: 'Llantas y neumáticos', reason: 'Repuesto de alta rotación' },
      { id: null, name: 'Aceites y lubricantes', reason: 'Insumo de mantenimiento frecuente' },
      { id: null, name: 'Cascos y accesorios', reason: 'Producto complementario de moto' },
    ],
    substitute: [
      { id: null, name: 'Repuestos de bicicleta', reason: 'Mercado de transporte alternativo' },
      { id: null, name: 'Repuestos automotrices', reason: 'Segmento adyacente de mayor escala' },
    ],
    operational: [
      { id: null, name: 'Herramientas mecánicas', reason: 'Equipo del taller' },
      { id: null, name: 'Importación de repuestos', reason: 'Cadena de abastecimiento clave' },
    ],
  },
  {
    keywords: ['catering', 'eventos', 'banquetes', 'cocina', 'comida para eventos', 'buffet'],
    direct: [
      { id: 902, name: 'Catering', reason: 'Categoría principal' },
      { id: 209, name: 'Eventos', reason: 'Canal de venta directo' },
    ],
    related: [
      { id: 906, name: 'Catering Dulce', reason: 'Subcategoría relacionada frecuente' },
      { id: null, name: 'Decoración de eventos', reason: 'Servicio complementario en el mismo canal' },
      { id: null, name: 'Fotografía de eventos', reason: 'Servicio que comparte el mismo canal' },
    ],
    substitute: [
      { id: null, name: 'Restaurantes', reason: 'Sustituto para eventos pequeños' },
    ],
    operational: [
      { id: null, name: 'Utensilios de cocina', reason: 'Equipamiento del servicio' },
      { id: null, name: 'Transporte refrigerado', reason: 'Logística necesaria' },
    ],
  },
]

export function mapPurposeToCategories(purposeText: string): {
  mappedCategories: MappedCategory[]
  overallConfidence: 'high' | 'medium' | 'low'
  matchedKeywords: string[]
} {
  const lower = purposeText.toLowerCase()
  const matchedKeywords: string[] = []
  const allMapped: MappedCategory[] = []

  for (const mapping of MAPPINGS) {
    const hits = mapping.keywords.filter(kw => lower.includes(kw))
    if (hits.length === 0) continue
    matchedKeywords.push(...hits)

    const confidence: 'exact' | 'strong' | 'weak' = hits.length >= 2 ? 'exact' : 'strong'

    for (const cat of mapping.direct) {
      allMapped.push({ categoryId: cat.id, categoryName: cat.name, mappingType: 'direct', confidence, reason: cat.reason, included: true })
    }
    for (const cat of mapping.related) {
      allMapped.push({ categoryId: cat.id, categoryName: cat.name, mappingType: 'related', confidence: 'strong', reason: cat.reason, included: true })
    }
    for (const cat of mapping.substitute) {
      allMapped.push({ categoryId: cat.id, categoryName: cat.name, mappingType: 'substitute', confidence: 'weak', reason: cat.reason, included: false })
    }
    for (const cat of mapping.operational) {
      allMapped.push({ categoryId: cat.id, categoryName: cat.name, mappingType: 'operational', confidence: 'weak', reason: cat.reason, included: false })
    }
  }

  const directCount = allMapped.filter(m => m.mappingType === 'direct').length
  const overallConfidence = directCount >= 2 ? 'high' : directCount >= 1 ? 'medium' : 'low'

  return { mappedCategories: allMapped, overallConfidence, matchedKeywords }
}

export function getCategoryIds(mappedCategories: MappedCategory[], includeOnly?: MappedCategory['mappingType'][]): number[] {
  return mappedCategories
    .filter(m => m.included && m.categoryId != null && (!includeOnly || includeOnly.includes(m.mappingType)))
    .map(m => m.categoryId!)
}
