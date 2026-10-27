import datetime
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import User, Institution, FDRInstrument, ReleaseRefundRequest, AuditLog, Notification, ReminderConfig, InstrumentVersionHistory
from .auth import hash_password
from .crypto import compute_audit_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding AetherVault database with authentic AICTE test entities...")

        # 1. Institutions
        institutions_data = [
            {
                "aicte_permanent_id": "1-9087654321",
                "name": "Apex Institute of Advanced Technology & AI",
                "state": "Delhi",
                "district": "South West Delhi",
                "institution_type": "Engineering & Technology",
                "contact_email": "sanjeevkumaredu8@gmail.com",
                "contact_phone": "+91 11 2689 4400",
                "address": "Sector C, Pocket 8, Vasant Kunj, New Delhi 110070",
                "nodal_officer": "Prof. R. K. Sharma (Registrar)"
            },
            {
                "aicte_permanent_id": "1-3349019283",
                "name": "Maharashtra Institute of Technology & Management",
                "state": "Maharashtra",
                "district": "Pune",
                "institution_type": "Management & Engineering",
                "contact_email": "sanjeevkumaredu8@gmail.com",
                "contact_phone": "+91 20 2740 5510",
                "address": "Kothrud Paud Road, Pune 411038",
                "nodal_officer": "Dr. Sunita Deshmukh"
            },
            {
                "aicte_permanent_id": "1-4521873910",
                "name": "Shanti Memorial College of Pharmaceutical Sciences",
                "state": "Karnataka",
                "district": "Bengaluru Urban",
                "institution_type": "Pharmacy",
                "contact_email": "sanjeevkumaredu8@gmail.com",
                "contact_phone": "+91 80 2341 8900",
                "address": "Rajajinagar Industrial Area, Bengaluru 560010",
                "nodal_officer": "Dr. V. Ramanathan"
            },
            {
                "aicte_permanent_id": "1-7782390145",
                "name": "Vivekananda Technical Polytechnic College",
                "state": "Tamil Nadu",
                "district": "Chennai",
                "institution_type": "Polytechnic Diploma",
                "contact_email": "sanjeevkumaredu8@gmail.com",
                "contact_phone": "+91 44 2235 1100",
                "address": "Guindy Institutional Area, Chennai 600025",
                "nodal_officer": "Thiru K. Anbarasan"
            },
            {
                "aicte_permanent_id": "1-6284901237",
                "name": "Gujarat Institute of Architecture & Planning",
                "state": "Gujarat",
                "district": "Ahmedabad",
                "institution_type": "Architecture & Town Planning",
                "contact_email": "sanjeevkumaredu8@gmail.com",
                "contact_phone": "+91 79 2630 1920",
                "address": "Navrangpura University Enclave, Ahmedabad 380009",
                "nodal_officer": "Ar. Meera Patel"
            }
        ]

        inst_objects = []
        for idata in institutions_data:
            inst = Institution(**idata)
            db.add(inst)
            inst_objects.append(inst)
        db.commit()

        # 2. Users (Role Based Access Control)
        users_data = [
            {
                "username": "admin",
                "email": "samplebot.reply@gmail.com",
                "full_name": "Dr. Arvind Kumar (AICTE Regulatory Bureau Head)",
                "hashed_password": hash_password("Password@123"),
                "role": "AICTE_ADMIN"
            },
            {
                "username": "approver",
                "email": "approver@aicte-india.org",
                "full_name": "Shri M. S. Raghavan (AICTE Approver & Competent Authority)",
                "hashed_password": hash_password("Password@123"),
                "role": "AICTE_APPROVER"
            },
            {
                "username": "scrutiny",
                "email": "scrutiny@aicte-india.org",
                "full_name": "Smt. Priya Nair (AICTE Scrutiny Officer / Maker)",
                "hashed_password": hash_password("Password@123"),
                "role": "AICTE_SCRUTINY_OFFICER"
            },
            {
                "username": "institution1",
                "email": "sanjeevkumaredu8@gmail.com",
                "full_name": "Apex Institute Admin (Nodal Officer)",
                "hashed_password": hash_password("Password@123"),
                "role": "INSTITUTION_USER",
                "institution_id": inst_objects[0].id
            },
            {
                "username": "institution2",
                "email": "sanjeevkumaredu8+pune@gmail.com",
                "full_name": "MIT Pune Officer",
                "hashed_password": hash_password("Password@123"),
                "role": "INSTITUTION_USER",
                "institution_id": inst_objects[1].id
            },
            {
                "username": "bank_officer",
                "email": "bank.nodal@bnb.gov.in",
                "full_name": "Rajeshwar Rao (Authorized Bank Nodal Officer)",
                "hashed_password": hash_password("Password@123"),
                "role": "BANK_OFFICER",
                "bank_code": "BNB"
            }
        ]

        for udata in users_data:
            u = User(**udata)
            db.add(u)
        db.commit()

        # 3. Reminder Configurations
        reminder_rules = [
            {"days_before": 60, "channel_smtp": True, "channel_whatsapp": True, "channel_ivr": False, "is_active": True},
            {"days_before": 30, "channel_smtp": True, "channel_whatsapp": True, "channel_ivr": True, "is_active": True},
            {"days_before": 15, "channel_smtp": True, "channel_whatsapp": True, "channel_ivr": True, "is_active": True},
            {"days_before": 7, "channel_smtp": True, "channel_whatsapp": True, "channel_ivr": True, "is_active": True},
            {"days_before": 0, "channel_smtp": True, "channel_whatsapp": True, "channel_ivr": True, "is_active": True}
        ]
        for r in reminder_rules:
            rc = ReminderConfig(**r)
            db.add(rc)
        db.commit()

        # 4. Sample FDR Instruments across lifecycle
        today = datetime.date.today()
        fdrs_data = [
            {
                "fdr_number": "BNB-2024-889100",
                "institution_id": inst_objects[0].id,
                "issuing_bank_name": "Bharat National Bank",
                "branch_name": "Vasant Kunj Branch",
                "ifsc_code": "BNBK0009988",
                "account_number": "110022339901",
                "principal_amount": 1500000.0,
                "maturity_amount": 3100000.0,
                "interest_rate": 7.25,
                "issue_date": datetime.date(2024, 2, 1),
                "maturity_date": datetime.date(2034, 2, 1),
                "term_months": 120,
                "lien_marked": True,
                "joint_account_title": "RO AICTE & Principal Apex Inst",
                "lifecycle_status": "ACTIVE",
                "submitted_data": {"fdr_number": "BNB-2024-889100", "principal_amount": 1500000.0},
                "ocr_data": {"fdr_number": "BNB-2024-889100", "principal_amount": 1500000.0, "ocr_verified": True},
                "bank_verified_data": {"ledger_fdr_number": "BNB-2024-889100", "ledger_principal_amount": 1500000.0},
                "discrepancy_details": []
            },
            {
                "fdr_number": "SBI-2024-550192",
                "institution_id": inst_objects[1].id,
                "issuing_bank_name": "State Bank of India",
                "branch_name": "Pune University Campus Branch",
                "ifsc_code": "SBIN0001421",
                "account_number": "30992817001",
                "principal_amount": 2500000.0,
                "maturity_amount": 5100000.0,
                "interest_rate": 7.10,
                "issue_date": datetime.date(2024, 3, 1),
                "maturity_date": today + datetime.timedelta(days=22), # Expiring soon
                "term_months": 120,
                "lien_marked": True,
                "joint_account_title": "Regional Officer Western Region AICTE & Director MIT Pune",
                "lifecycle_status": "EXPIRING_SOON",
                "submitted_data": {"fdr_number": "SBI-2024-550192"},
                "ocr_data": {"fdr_number": "SBI-2024-550192"},
                "bank_verified_data": {"ledger_fdr_number": "SBI-2024-550192"},
                "discrepancy_details": []
            },
            {
                "fdr_number": "PNB-2024-118942",
                "institution_id": inst_objects[2].id,
                "issuing_bank_name": "Punjab National Bank",
                "branch_name": "Rajajinagar Bengaluru Branch",
                "ifsc_code": "PUNB0123400",
                "account_number": "089200210001",
                "principal_amount": 3500000.0,
                "maturity_amount": 7200000.0,
                "interest_rate": 7.00,
                "issue_date": datetime.date(2014, 1, 15),
                "maturity_date": today - datetime.timedelta(days=5), # Matured
                "term_months": 120,
                "lien_marked": True,
                "joint_account_title": "RO SW AICTE & Principal Shanti Memorial",
                "lifecycle_status": "MATURED",
                "submitted_data": {"fdr_number": "PNB-2024-118942"},
                "ocr_data": {"fdr_number": "PNB-2024-118942"},
                "bank_verified_data": {"ledger_fdr_number": "PNB-2024-118942"},
                "discrepancy_details": []
            }
        ]

        for fdata in fdrs_data:
            fdr = FDRInstrument(**fdata)
            db.add(fdr)
            db.flush()
            vh = InstrumentVersionHistory(
                fdr_id=fdr.id,
                version_number=1,
                snapshot_data=fdata,
                change_action="INITIAL_REGISTRATION",
                changed_by_user="System Seed Engine"
            )
            db.add(vh)

        db.commit()
        print("AetherVault initial database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
