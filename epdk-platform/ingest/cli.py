#!/usr/bin/env python3
import sys
import argparse
from pathlib import Path
import uuid

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from config import load_config
from parser import ExcelParser
from transformer import DataTransformer
from loader import DatabaseLoader
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def cmd_ingest(args):
    logger.info("Starting ingestion")
    logger.info(f"Input directory: {args.input_dir}")
    
    config = load_config()
    batch_id = uuid.uuid4()
    
    parser = ExcelParser(config)
    transformer = DataTransformer(config)
    loader = DatabaseLoader(config, batch_id)
    
    loader.connect()
    loader.start_batch()
    
    input_path = Path(args.input_dir)
    excel_files = list(input_path.glob("*.xls")) + list(input_path.glob("*.xlsx"))
    
    logger.info(f"Found {len(excel_files)} Excel files")
    
    total_stats = {
        'files_processed': 0,
        'stations_inserted': 0,
        'stations_updated': 0,
        'connectors_inserted': 0
    }
    
    for excel_file in excel_files:
        logger.info(f"Processing: {excel_file.name}")
        try:
            raw_data = parser.parse_file(excel_file)
            transformed = transformer.transform(raw_data, excel_file.name)
            stats = loader.load_data(transformed)
            
            total_stats['files_processed'] += 1
            total_stats['stations_inserted'] += stats['stations_inserted']
            total_stats['stations_updated'] += stats['stations_updated']
            total_stats['connectors_inserted'] += stats['connectors_inserted']
            
            logger.info(f"  ✓ {stats['stations_inserted']} stations inserted, "
                       f"{stats['stations_updated']} updated, "
                       f"{stats['connectors_inserted']} connectors")
        except Exception as e:
            logger.error(f"Error processing {excel_file.name}: {e}")
    
    loader.complete_batch(total_stats)
    loader.disconnect()
    
    logger.info("=" * 80)
    logger.info(f"COMPLETED - Batch ID: {batch_id}")
    logger.info(f"Files: {total_stats['files_processed']}")
    logger.info(f"Stations: {total_stats['stations_inserted']} inserted, {total_stats['stations_updated']} updated")
    logger.info(f"Connectors: {total_stats['connectors_inserted']}")
    logger.info("=" * 80)
    
    return 0

def main():
    parser = argparse.ArgumentParser(description="EPDK Charging Stations Ingestion")
    subparsers = parser.add_subparsers(dest='command')
    
    ingest_parser = subparsers.add_parser('ingest', help='Ingest Excel files')
    ingest_parser.add_argument('--input-dir', required=True, help='Directory with Excel files')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == 'ingest':
        return cmd_ingest(args)

if __name__ == "__main__":
    sys.exit(main())
