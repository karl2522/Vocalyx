import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def determine_sheet_type(sheet_name):
    """
    Determine if sheet is Midterm or Final based on sheet name.
    
    Args:
        sheet_name: Name of the sheet (e.g., "Midterm", "Final", "Midterm Exam")
    
    Returns:
        str: 'midterm', 'final', or None if cannot determine
    """
    if not sheet_name:
        return None
    
    sheet_lower = str(sheet_name).lower().strip()
    
    # Check for midterm (but not prefinal)
    if 'midterm' in sheet_lower:
        return 'midterm'
    
    # Check for final (but exclude prefinal)
    if 'final' in sheet_lower and 'prefinal' not in sheet_lower:
        return 'final'
    
    return None


class GoogleAppsScriptService:
    """Service to interact with Google Apps Script Web Apps"""
    
    def __init__(self, web_app_url=None):
        """
        Initialize the Apps Script service.
        
        Args:
            web_app_url: Optional Web App URL. If not provided, uses settings.GOOGLE_APPS_SCRIPT_WEB_APP_URL
        """
        self.web_app_url = web_app_url or getattr(settings, 'GOOGLE_APPS_SCRIPT_WEB_APP_URL', '')
    
    def register_category(self, display_name, weight_decimal, internal_id=None, sheet_type=None, formula_reference=None, spreadsheet_id=None):
        """
        Register a category in the SETTINGS sheet via Apps Script.
        
        Args:
            display_name: Display name of the category (e.g., "Quiz")
            weight_decimal: Weight as decimal (e.g., 0.40 for 40%)
            internal_id: Pre-generated internal ID (REQUIRED for consistency)
            sheet_type: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
            formula_reference: OPTIONAL: Formula reference (e.g., "=Midterm!O2") to auto-sync with sheet
            spreadsheet_id: OPTIONAL: Spreadsheet ID to write to (if not provided, Apps Script uses active spreadsheet)
        
        Returns:
            dict: {
                'success': bool, 
                'message': str, 
                'internal_id': str,
                'written_id': str  # What Apps Script actually wrote
            }
        """
        if not self.web_app_url:
            logger.warning("Apps Script Web App URL not configured")
            return {
                'success': False, 
                'error': 'Apps Script not configured'
            }
        
        # 🔥 CRITICAL: Require internal_id to ensure consistency
        if not internal_id:
            logger.warning("No internal_id provided - ID generation may not match!")
            # Still proceed, but log warning
        
        try:
            payload = {
                'action': 'registerCategory',
                'displayName': display_name,
                'weight': weight_decimal
            }
            
            # ALWAYS pass internal_id if provided
            if internal_id:
                payload['internalId'] = internal_id
                logger.info(f"Sending pre-generated ID '{internal_id}' to Apps Script")
            
            # 🔥 NEW: Pass sheet_type to determine which SETTINGS tab to use
            if sheet_type:
                payload['sheetType'] = sheet_type
                logger.info(f"Using SETTINGS tab for sheet type: '{sheet_type}'")
            
            # 🔥 PHASE 2: Pass formula_reference if provided
            if formula_reference:
                payload['formulaReference'] = formula_reference
                logger.info(f"Passing formula reference '{formula_reference}' to Apps Script")
            
            # FIX: Pass spreadsheet_id to write to user's sheet, not template
            if spreadsheet_id:
                payload['spreadsheetId'] = spreadsheet_id
                logger.info(f"PASSING spreadsheet ID '{spreadsheet_id}' to Apps Script (user's sheet)")
                logger.info(f"DEBUG: spreadsheet_id type: {type(spreadsheet_id).__name__}, value: '{spreadsheet_id}'")
            else:
                logger.error("CRITICAL: No spreadsheet_id provided - Apps Script will write to TEMPLATE (active spreadsheet)")
                logger.error("This will cause metadata to be written to template instead of user's sheet!")
            
            logger.info(f"Calling Apps Script: {self.web_app_url}")
            logger.info(f"DEBUG: Full payload keys: {list(payload.keys())}")
            logger.info(f"DEBUG: Payload spreadsheetId value: {payload.get('spreadsheetId', 'MISSING')}")
            logger.info(f"Payload: {payload}")
            
            response = requests.post(
                self.web_app_url,
                json=payload,
                timeout=10
            )
            
            logger.info(f"Apps Script response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Apps Script response: {result}")
                logger.info(f"DEBUG: Apps Script status: {result.get('status', 'unknown')}")
                logger.info(f"DEBUG: Apps Script message: {result.get('message', 'no message')}")
                
                # VERIFY: Check if IDs match
                returned_id = result.get('internal_id', '').upper().strip()
                written_id = result.get('written_id', '').upper().strip()
                
                if internal_id:
                    expected_id = internal_id.upper().strip()
                    if returned_id and returned_id != expected_id:
                        logger.warning(f"ID mismatch: Sent '{expected_id}' but got '{returned_id}'")
                    elif written_id and written_id != expected_id:
                        logger.warning(f"ID mismatch: Sent '{expected_id}' but Apps Script wrote '{written_id}'")
                else:
                    logger.info(f"Verified ID consistency: '{expected_id}' matches Apps Script")
                
                return {
                    'success': result.get('status') == 'success',
                    'message': result.get('message', ''),
                    'internal_id': returned_id or internal_id or '',
                    'written_id': written_id or returned_id or ''
                }
            else:
                error_text = response.text
                logger.error(f"Apps Script returned non-200 status: {response.status_code}")
                logger.error(f"Response text: {error_text[:500]}")  # First 500 chars
                return {
                    'success': False,
                    'error': f'Apps Script returned status {response.status_code}: {error_text}'
                }
                
        except requests.exceptions.Timeout:
            logger.error("Apps Script request timed out")
            return {
                'success': False,
                'error': 'Apps Script request timed out'
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling Apps Script: {str(e)}")
            return {
                'success': False,
                'error': f'Network error: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Unexpected error calling Apps Script: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_category(self, internal_id, sheet_type=None, spreadsheet_id=None):
        """
        Delete a category from the SETTINGS sheet via Apps Script.
        
        Args:
            internal_id: Internal ID of the category (e.g., "QUIZ")
            sheet_type: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
            spreadsheet_id: OPTIONAL: Spreadsheet ID to delete from (if not provided, Apps Script uses active spreadsheet)
        
        Returns:
            dict: {'success': bool, 'message': str}
        """
        if not self.web_app_url:
            return {'success': False, 'error': 'Apps Script not configured'}
        
        try:
            payload = {
                'action': 'deleteCategory',
                'internalId': internal_id
            }
            
            # NEW: Pass sheet_type to determine which SETTINGS tab to use
            if sheet_type:
                payload['sheetType'] = sheet_type
                logger.info(f"Deleting from SETTINGS tab for sheet type: '{sheet_type}'")
            
            # FIX: Pass spreadsheet_id to delete from user's sheet, not template
            if spreadsheet_id:
                payload['spreadsheetId'] = spreadsheet_id
                logger.info(f"Passing spreadsheet ID '{spreadsheet_id}' to Apps Script (user's sheet)")
            else:
                logger.warning("No spreadsheet_id provided - Apps Script will delete from template (active spreadsheet)")
            
            response = requests.post(
                self.web_app_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': result.get('status') == 'success',
                    'message': result.get('message', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Apps Script returned status {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"Error calling Apps Script: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_category_weight(self, internal_id, new_weight, sheet_type=None):
        """
        Update the weight of a category in the SETTINGS sheet.
        
        Args:
            internal_id: Internal ID of the category
            new_weight: New weight as decimal
            sheet_type: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to use
        
        Returns:
            dict: {'success': bool, 'message': str}
        """
        if not self.web_app_url:
            return {'success': False, 'error': 'Apps Script not configured'}
        
        try:
            payload = {
                'action': 'updateCategoryWeight',
                'internalId': internal_id,
                'weight': new_weight
            }
            
            # 🔥 NEW: Pass sheet_type to determine which SETTINGS tab to use
            if sheet_type:
                payload['sheetType'] = sheet_type
                logger.info(f"Updating SETTINGS tab for sheet type: '{sheet_type}'")
            
            response = requests.post(
                self.web_app_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': result.get('status') == 'success',
                    'message': result.get('message', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Apps Script returned status {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"Error calling Apps Script: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def migrate_settings_to_formulas(self, sheet_type):
        """
        🔥 PHASE 3: Migrate existing categories in SETTINGS tab from values to formulas.
        
        Args:
            sheet_type: Sheet type ('midterm' or 'final') to determine which SETTINGS tab to migrate
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'migrated': int,
                'skipped': int,
                'errors': list,
                'migrated_categories': list
            }
        """
        if not self.web_app_url:
            return {'success': False, 'error': 'Apps Script not configured'}
        
        try:
            payload = {
                'action': 'migrateSettingsToFormulas',
                'sheetType': sheet_type
            }
            
            logger.info(f"Triggering migration for SETTINGS tab: sheet_type='{sheet_type}'")
            
            response = requests.post(
                self.web_app_url,
                json=payload,
                timeout=30  # Longer timeout for migration
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': result.get('status') == 'success',
                    'message': result.get('message', ''),
                    'migrated': result.get('migrated', 0),
                    'skipped': result.get('skipped', 0),
                    'errors': result.get('errors', []),
                    'migrated_categories': result.get('migratedCategories', [])
                }
            else:
                error_text = response.text
                logger.error(f"Apps Script migration returned status {response.status_code}: {error_text}")
                return {
                    'success': False,
                    'error': f'Apps Script returned status {response.status_code}: {error_text}'
                }
                
        except requests.exceptions.Timeout:
            logger.error("Apps Script migration request timed out")
            return {
                'success': False,
                'error': 'Migration request timed out'
            }
        except Exception as e:
            logger.error(f"Error calling Apps Script migration: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }
