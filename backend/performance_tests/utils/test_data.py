"""
Test data generators for performance tests.
"""
from faker import Faker

fake = Faker()

def generate_user_data():
    """Generate mock user registration data with test prefix for easy cleanup."""
    from config.settings import TEST_DATA_PREFIX
    
    password = fake.password(length=12)
    # Use prefix to easily identify and clean up test data
    test_email = f"{TEST_DATA_PREFIX}{fake.user_name()}_{fake.random_int(1000, 9999)}@{fake.domain_name()}"
    
    return {
        'email': test_email,
        'password': password,
        'password2': password,  # Password confirmation required by API
        'first_name': f"{TEST_DATA_PREFIX}{fake.first_name()}",
        'last_name': fake.last_name(),
        # Note: username is auto-generated from email, not required in API
    }

def generate_class_record_data():
    """Generate mock class record data with test prefix for easy cleanup."""
    from config.settings import TEST_DATA_PREFIX
    
    return {
        'name': f"{TEST_DATA_PREFIX}{fake.word().capitalize()} {fake.word().capitalize()}",
        'section': fake.random_letter().upper() + str(fake.random_int(min=1, max=9)),
        'subject': f"{TEST_DATA_PREFIX}{fake.word().capitalize()}",
        'school_year': f"{fake.year()}-{fake.year() + 1}",
    }

def generate_student_data():
    """Generate mock student data."""
    return {
        'student_number': fake.random_int(min=1000000, max=9999999),
        'first_name': fake.first_name(),
        'last_name': fake.last_name(),
        'middle_name': fake.first_name(),
        'email': fake.email(),
    }

def generate_grade_data():
    """Generate mock grade data."""
    return {
        'score': fake.random_int(min=0, max=100),
        'max_score': 100,
    }

def generate_notification_data():
    """Generate mock notification data."""
    return {
        'title': fake.sentence(nb_words=4),
        'message': fake.text(max_nb_chars=200),
        'type': fake.random_element(elements=('info', 'warning', 'success', 'error')),
    }

def get_test_sheet_ids():
    """Get test sheet IDs from configuration or return defaults."""
    from config.settings import TEST_SHEET_IDS
    
    # If no test sheets configured, return empty list
    # Tests should handle this gracefully
    return TEST_SHEET_IDS if TEST_SHEET_IDS else []

def generate_cell_update_data():
    """Generate mock cell update data for Google Sheets."""
    return {
        'row': fake.random_int(min=2, max=100),
        'col': fake.random_int(min=1, max=10),
        'value': str(fake.random_int(min=0, max=100)),
    }

