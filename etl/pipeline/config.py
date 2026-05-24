import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    database_url:             str = field(default_factory=lambda: os.environ['DATABASE_URL'])
    k_anonymity_threshold:    int = int(os.getenv('K_ANONYMITY_THRESHOLD', '5'))
    batch_size:               int = int(os.getenv('ETL_BATCH_SIZE', '1000'))
    incremental_lookback_h:   int = int(os.getenv('ETL_INCREMENTAL_LOOKBACK_H', '2'))
    dry_run:                  bool = os.getenv('DRY_RUN', 'false').lower() == 'true'
    log_level:                str = os.getenv('LOG_LEVEL', 'INFO')
    log_format:               str = os.getenv('LOG_FORMAT', 'text')


config = Config()
