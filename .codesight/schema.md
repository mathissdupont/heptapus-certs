# Schema

### AccreditationBody
- id: Integer (pk)
- short_code: String (unique)
- name: String
- logo_url: Text (nullable)
- verification_url_pattern: Text (nullable)
- created_at: DateTime

### OrgAccreditation
- id: Integer (pk)
- organization_id: Integer (fk, index)
- body_id: Integer (fk)
- accreditation_number: String (nullable)
- valid_from: DateTime (nullable)
- valid_until: DateTime (nullable)
- documents_json: JSONB (nullable)
- notes: Text (nullable)
- created_at: DateTime
- updated_at: DateTime

### EventCpdConfig
- id: Integer (pk)
- event_id: Integer (fk, unique, index)
- body_id: Integer (fk)
- cpd_hours: Numeric (default)
- cpd_category: String (nullable)
- cpd_unit_type: String
- created_at: DateTime
- updated_at: DateTime

### MemberCpdLog
- id: Integer (pk)
- member_id: Integer (fk, index)
- event_id: Integer (fk)
- body_id: Integer (fk)
- cpd_hours: Numeric
- cpd_category: String (nullable)
- certificate_id: Integer (fk, nullable)
- earned_at: DateTime

### AIDigestJob
- id: Integer (pk)
- user_id: Integer
- week_start: Date
- status: String (default)
- digest_html: Text (nullable)
- sent_at: DateTime (nullable)
- error: String (nullable)
- created_at: DateTime (default)

### PublicMemberConnection
- id: Integer (pk)
- follower_id: Integer (fk)
- following_id: Integer (fk)
- created_at: DateTime (default)
- _relations_: follower: PublicMember, following: PublicMember

### PublicMemberConnectionRequest
- id: Integer (pk)
- requester_id: Integer (fk)
- recipient_id: Integer (fk)
- status: String (default)
- created_at: DateTime (default)
- updated_at: DateTime (default)
- _relations_: requester: PublicMember, recipient: PublicMember

### PublicMemberBlocklist
- id: Integer (pk)
- blocker_id: Integer (fk)
- blocked_id: Integer (fk)
- reason: String (nullable)
- created_at: DateTime (default)
- _relations_: blocker: PublicMember, blocked: PublicMember

### CrmAccount
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- domain: String (nullable)
- industry: String (nullable)
- size_bucket: String (nullable)
- owner_user_id: Integer (fk, nullable)
- annual_value: Numeric (nullable)
- notes: Text (default)
- tags: JSONB (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CrmAccountContact
- id: Integer (pk)
- account_id: Integer (fk, index)
- participant_crm_profile_id: Integer (fk, index)
- role: String (nullable)
- is_primary: Boolean (default)
- created_at: DateTime

### CrmDeal
- id: Integer (pk)
- account_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- name: String
- stage: String (default, index)
- amount: Numeric (nullable)
- expected_close_date: DateTime (nullable)
- owner_user_id: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CrmDealActivity
- id: Integer (pk)
- deal_id: Integer (fk, index)
- activity_type: String
- content: Text (default)
- user_id: Integer (fk, nullable)
- activity_at: DateTime (index)
- created_at: DateTime

### CrmEmailSequence
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- description: Text (nullable)
- active: Boolean
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CrmSequenceStep
- id: Integer (pk)
- sequence_id: Integer (fk, index)
- step_order: Integer
- delay_days: Integer
- email_template_id: Integer (fk, nullable)
- subject_override: String (nullable)
- created_at: DateTime

### CrmSequenceEnrollment
- id: Integer (pk)
- sequence_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- email: String (index)
- enrolled_at: DateTime
- current_step: Integer
- next_send_at: DateTime (nullable, index)
- status: String
- completed_at: DateTime (nullable)
- unenrolled_at: DateTime (nullable)

### DocumentExportJob
- id: Integer (pk)
- export_type: String (index)
- export_format: String (default)
- requested_by: Integer (fk, index)
- organization_id: Integer (fk, nullable, index)
- filters: JSONB (default)
- status: String (default, index)
- row_count: Integer (default)
- output_file_path: Text (nullable)
- output_filename: String (nullable)
- error_message: Text (nullable)
- email_sent_at: DateTime (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)

### Domain
- id: Integer (pk)
- domain: String (unique, index)
- owner: String (nullable)
- token: String (unique, index)
- status: String (default)
- created_at: DateTime (default)

### EventTicketType
- id: Integer (pk)
- event_id: Integer
- name: String
- description: Text (nullable)
- price: Numeric (default)
- currency: String (default)
- capacity: Integer (nullable)
- sold_count: Integer (default)
- is_active: Boolean (default)
- sort_order: Integer (default)
- created_at: DateTime (default)
- updated_at: DateTime (default)

### LeadCaptureForm
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- slug: String (unique, index)
- fields_json: JSONB (default)
- destination: String (default)
- auto_tag: String (nullable)
- redirect_url: Text (nullable)
- active: Integer (default)
- submission_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime

### LeadCaptureSubmission
- id: Integer (pk)
- form_id: Integer (fk, index)
- organization_id: Integer (fk, index)
- data_json: JSONB (default)
- source_url: Text (nullable)
- utm_source: String (nullable)
- utm_medium: String (nullable)
- utm_campaign: String (nullable)
- ip_addr: String (nullable)
- submitted_at: DateTime (index)

### LearningPath
- id: Integer (pk)
- org_id: Integer (fk)
- name: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- published: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: steps: , enrollments: 

### LearningPathStep
- id: Integer (pk)
- path_id: Integer (fk, index)
- event_id: Integer (fk, index)
- order: Integer (default)
- required: Boolean (default)
- min_score_override: Integer (nullable)
- _relations_: path: , completions: 

### LearningPathEnrollment
- id: Integer (pk)
- path_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- _relations_: path: , step_completions: 

### LearningPathStepCompletion
- id: Integer (pk)
- enrollment_id: Integer (fk, index)
- step_id: Integer (fk, index)
- certificate_id: Integer (fk, nullable)
- completed_at: DateTime
- _relations_: enrollment: , step: 

### CourseGradeItem
- id: Integer (pk)
- course_id: Integer (fk, index)
- item_type: String (default)
- item_ref_id: Integer (nullable)
- title: String
- max_points: Integer (default)
- weight_pct: Numeric (default)
- order: Integer (default)
- created_at: DateTime

### CourseGradeSummary
- id: Integer (pk)
- enrollment_id: Integer (fk, unique)
- weighted_avg: Numeric (nullable)
- letter_grade: String (nullable)
- passed: Boolean (default)
- computed_at: DateTime
- _relations_: enrollment: CourseEnrollment

### CourseDiscussion
- id: Integer (pk)
- course_id: Integer (fk, index)
- module_id: Integer (fk, nullable)
- author_member_id: Integer (fk, nullable)
- title: String
- body: Text
- is_pinned: Boolean (default)
- is_locked: Boolean (default)
- reply_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: replies: 

### DiscussionReply
- id: Integer (pk)
- discussion_id: Integer (fk, index)
- parent_reply_id: Integer (fk, nullable)
- author_member_id: Integer (fk, nullable)
- body: Text
- is_instructor_reply: Boolean (default)
- created_at: DateTime
- _relations_: discussion: 

### Rubric
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- created_at: DateTime
- _relations_: criteria: 

### RubricCriterion
- id: Integer (pk)
- rubric_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- points: Integer (default)
- order: Integer (default)
- _relations_: rubric: , ratings: 

### RubricRating
- id: Integer (pk)
- criterion_id: Integer (fk, index)
- description: String
- points: Integer (default)
- _relations_: criterion: 

### SubmissionRubricScore
- id: Integer (pk)
- submission_id: Integer (fk, index)
- criterion_id: Integer (fk, index)
- rating_id: Integer (fk, nullable)
- points_earned: Integer (default)
- comment: Text (nullable)

### LearningOutcome
- id: Integer (pk)
- org_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- mastery_points: Integer (default)
- display_name: String (nullable)
- created_at: DateTime
- _relations_: alignments: 

### CourseOutcomeAlignment
- id: Integer (pk)
- course_id: Integer (fk, index)
- outcome_id: Integer (fk, index)
- module_id: Integer (fk, nullable)
- _relations_: outcome: 

### OutcomeMastery
- id: Integer (pk)
- member_id: Integer (fk, index)
- outcome_id: Integer (fk, index)
- score: Integer (default)
- mastered_at: DateTime (nullable)
- evidence_type: String (nullable)
- evidence_id: Integer (nullable)

### CourseGroup
- id: Integer (pk)
- course_id: Integer (fk, index)
- name: String
- max_members: Integer (nullable)
- created_by_user_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: members: 

### CourseGroupMember
- id: Integer (pk)
- group_id: Integer (fk, index)
- member_id: Integer (fk, index)
- joined_at: DateTime
- _relations_: group: 

### Badge
- id: Integer (pk)
- org_id: Integer (fk, index)
- name: String
- description: Text (nullable)
- image_url: Text (nullable)
- criteria_text: Text (nullable)
- trigger_type: String (default)
- trigger_ref_id: Integer (nullable)
- created_at: DateTime
- _relations_: awards: 

### BadgeAward
- id: Integer (pk)
- badge_id: Integer (fk, index)
- member_id: Integer (fk, index)
- issued_at: DateTime
- evidence_url: Text (nullable)
- issued_by_user_id: Integer (fk, nullable)
- _relations_: badge: 

### CourseCalendarEvent
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- event_type: String (default)
- starts_at: DateTime
- ends_at: DateTime (nullable)
- module_id: Integer (fk, nullable)
- conference_url: Text (nullable)
- description: Text (nullable)
- created_at: DateTime

### CourseSyllabus
- id: Integer (pk)
- course_id: Integer (fk, unique)
- content_html: Text (default)
- updated_at: DateTime

### CourseAttendanceSession
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- session_type: String (default)
- starts_at: DateTime
- ends_at: DateTime (nullable)
- location: String (nullable)
- required: Boolean (default)
- notes: Text (nullable)
- created_by_user_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: records: 

### CourseAttendanceRecord
- id: Integer (pk)
- session_id: Integer (fk, index)
- enrollment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- status: String (default)
- minutes_attended: Integer (nullable)
- note: Text (nullable)
- recorded_by_user_id: Integer (fk, nullable)
- recorded_at: DateTime
- _relations_: session: 

### EventLmsBridge
- id: Integer (pk)
- event_id: Integer (fk, index)
- course_id: Integer (fk, nullable)
- trigger_on: String (default)
- action: String (default)
- action_ref_id: Integer (nullable)
- is_active: Boolean (default)
- created_at: DateTime

### LMSQuiz
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- time_limit_minutes: Integer (nullable)
- attempts_allowed: Integer (default)
- passing_score: Integer (default)
- shuffle_questions: Boolean (default)
- show_correct_answers: Boolean (default)
- created_at: DateTime
- _relations_: questions: , attempts: 

### LMSQuizQuestion
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- question_text: Text
- question_type: String (default)
- points: Integer (default)
- order: Integer (default)
- explanation: Text (nullable)
- _relations_: quiz: , choices: 

### LMSQuizChoice
- id: Integer (pk)
- question_id: Integer (fk, index)
- choice_text: String
- is_correct: Boolean (default)
- order: Integer (default)
- _relations_: question: 

### LMSQuizAttempt
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- member_id: Integer (fk, index)
- started_at: DateTime
- submitted_at: DateTime (nullable)
- score: Numeric (nullable)
- passed: Boolean (nullable)
- attempt_number: Integer (default)
- _relations_: quiz: , answers: 

### LMSQuizAnswer
- id: Integer (pk)
- attempt_id: Integer (fk, index)
- question_id: Integer (fk, index)
- selected_choice_ids: JSON (nullable)
- text_answer: Text (nullable)
- _relations_: attempt: 

### TrainingCourse
- id: Integer (pk)
- org_id: Integer (fk)
- title: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- category: String (nullable)
- course_code: String (nullable)
- department: String (nullable)
- term: String (nullable)
- section: String (nullable)
- credits: Numeric (nullable)
- capacity: Integer (nullable)
- enrollment_policy: String (default)
- starts_at: DateTime (nullable)
- ends_at: DateTime (nullable)
- level: String (default)
- language: String (default)
- is_published: Boolean (default)
- is_featured: Boolean (default)
- price: Numeric (nullable)
- cert_template_url: Text (nullable)
- passing_score: Integer (nullable)
- is_marketplace_listed: Boolean (default)
- marketplace_price: Numeric (nullable)
- marketplace_description: Text (nullable)
- preview_video_url: Text (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: modules: , enrollments: , announcements: 

### CourseModule
- id: Integer (pk)
- course_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- order: Integer (default)
- content_type: String (default)
- content_url: Text (nullable)
- content_text: Text (nullable)
- duration_minutes: Integer (nullable)
- is_required: Boolean (default)
- quiz_id: Integer (fk, nullable)
- created_at: DateTime
- _relations_: course: , progress_records: , assignment: 

### CourseEnrollment
- id: Integer (pk)
- course_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- final_grade: Integer (nullable)
- certificate_id: Integer (fk, nullable)
- cert_pdf_url: Text (nullable)
- status: String (default, index)
- _relations_: course: , module_progress: , grade_summary: CourseGradeSummary

### ModuleProgress
- id: Integer (pk)
- enrollment_id: Integer (fk, index)
- module_id: Integer (fk, index)
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- time_spent_seconds: Integer (default)
- quiz_score: Integer (nullable)
- _relations_: enrollment: , module: 

### CourseAssignment
- id: Integer (pk)
- module_id: Integer (fk, index, unique)
- instructions: Text (nullable)
- due_date: DateTime (nullable)
- max_points: Integer (default)
- submission_type: String (default)
- _relations_: module: , submissions: 

### AssignmentSubmission
- id: Integer (pk)
- assignment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- submitted_at: DateTime
- submission_text: Text (nullable)
- submission_url: Text (nullable)
- file_url: Text (nullable)
- grade: Integer (nullable)
- feedback: Text (nullable)
- graded_at: DateTime (nullable)
- graded_by_user_id: Integer (fk, nullable)
- _relations_: assignment: 

### LmsJourney
- id: Integer (pk)
- org_id: Integer (fk)
- title: String
- description: Text (nullable)
- thumbnail_url: Text (nullable)
- is_published: Boolean (default)
- cert_template_url: Text (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: steps: , enrollments: 

### LmsJourneyStep
- id: Integer (pk)
- journey_id: Integer (fk, index)
- course_id: Integer (fk, index)
- order: Integer (default)
- is_required: Boolean (default)
- _relations_: journey: 

### LmsJourneyEnrollment
- id: Integer (pk)
- journey_id: Integer (fk, index)
- member_id: Integer (fk, index)
- enrolled_at: DateTime
- completed_at: DateTime (nullable)
- progress_pct: Integer (default)
- certificate_id: Integer (fk, nullable)
- cert_pdf_url: Text (nullable)
- _relations_: journey: 

### CourseAnnouncement
- id: Integer (pk)
- course_id: Integer (fk, index)
- author_user_id: Integer (fk, index)
- title: String
- body: Text
- created_at: DateTime
- _relations_: course: 

### OrgLmsStaff
- id: Integer (pk)
- org_id: Integer (fk, index)
- user_id: Integer (fk, index)
- role: String (default)
- course_id: Integer (fk, nullable)
- created_at: DateTime

### CourseCpdConfig
- id: Integer (pk)
- course_id: Integer (fk, index)
- accreditation_body_id: Integer (nullable)
- cpd_hours: Numeric (default)
- cpd_category: String (nullable)

### LtiTool
- id: Integer (pk)
- org_id: Integer (fk, index)
- name: String
- launch_url: Text
- consumer_key: String (nullable)
- shared_secret: String (nullable)
- custom_params_json: Text (nullable)
- provider: String
- is_active: Boolean
- created_at: DateTime

### User
- id: Integer (pk)
- email: String (unique, index)
- password_hash: String
- role: Role (index)
- heptacoin_balaonce: Integer (default)
- created_at: DateTime
- deleted_at: DateTime (nullable, index)
- is_verified: Boolean (default)
- verification_token: String (nullable)
- password_reset_token: String (nullable)
- magic_link_token: String (nullable)
- _relations_: events: , transactions: , email_config: , google_integration: , ms365_integration: 

### PublicMember
- id: Integer (pk)
- public_id: String (unique, index)
- email: String (unique, index)
- display_name: String
- bio: Text (nullable)
- avatar_url: Text (nullable)
- headline: String (nullable)
- location: String (nullable)
- website_url: String (nullable)
- contact_email: String (nullable)
- digest_opt_in: Boolean (default, index)
- password_hash: String
- created_at: DateTime
- deleted_at: DateTime (nullable, index)
- is_verified: Boolean (default)
- verification_token: String (nullable)
- password_reset_token: String (nullable)
- _relations_: attendees: , comments: 

### Event
- id: Integer (pk)
- public_id: String (unique, index, nullable)
- admin_id: int (fk, index)
- name: String
- template_image_url: Text
- config: JSONB (default)
- created_at: DateTime
- cert_seq: Integer (default)
- event_date: date_type (nullable)
- event_description: Text (nullable)
- event_location: String (nullable)
- min_sessions_required: Integer (default)
- event_banner_url: Text (nullable)
- auto_email_on_cert: Boolean (default)
- cert_email_template_id: Integer (nullable)
- event_type: String (default)
- certificate_enabled: Boolean (default)
- checkin_enabled: Boolean (default)
- ticketing_enabled: Boolean (default)
- registration_enabled: Boolean (default)
- raffles_enabled: Boolean (default)
- gamification_enabled: Boolean (default)
- requires_approval: Boolean (default)
- quiz_enabled: Boolean (default)
- cpd_enabled: Boolean (default)
- is_marketplace_listed: Boolean (default)
- marketplace_category: String (nullable)
- marketplace_description: Text (nullable)
- marketplace_price: Numeric (nullable)
- _relations_: admin: , certificates: , sessions: , attendees: , tickets: , comments: , raffles: , template_snapshots: , email_templates: , bulk_email_jobs: , bulk_certificate_jobs: , team_members: 

### EventTeamMember
- id: Integer (pk)
- event_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String (index)
- role: String (default, index)
- permissions: JSONB (nullable)
- status: String (default, index)
- invited_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , user: , inviter: 

### Certificate
- id: Integer (pk)
- uuid: String (unique, index)
- student_name: String
- event_id: int (fk, index)
- pdf_url: Text
- status: CertStatus (default)
- created_at: DateTime
- public_id: String (nullable)
- issued_at: DateTime
- hosting_term: String (default)
- hosting_ends_at: DateTime (nullable)
- auto_renew_enabled: Boolean (default)
- asset_size_bytes: Integer (default)
- deleted_at: DateTime (nullable)
- certificate_tier: String (nullable)
- tier_template_id: Integer (nullable)
- survey_required: Boolean (default)
- worldpass_anchor_id: String (nullable)
- _relations_: event: 

### TrainingAssignment
- id: Integer (pk)
- organization_id: Integer (fk, index)
- event_id: Integer (fk, nullable, index)
- course_id: Integer (fk, nullable, index)
- renewal_event_id: Integer (fk, nullable, index)
- certificate_id: Integer (fk, nullable, index)
- title: String
- description: Text (nullable)
- assignee_name: String
- assignee_email: String (index)
- department_id: Integer (fk, nullable, index)
- department: String (nullable, index)
- manager_email: String (nullable, index)
- approval_status: String (default, index)
- approved_by: Integer (fk, nullable)
- approved_at: DateTime (nullable)
- evidence_url: Text (nullable)
- evidence_label: String (nullable)
- template_id: Integer (fk, nullable, index)
- recurring_rule_id: Integer (fk, nullable, index)
- required: Boolean (default, index)
- status: String (default, index)
- due_at: DateTime (nullable, index)
- completed_at: DateTime (nullable)
- renewal_due_at: DateTime (nullable, index)
- notify_before_days: Integer (default)
- last_notified_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrganizationDepartment
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- code: String (nullable)
- manager_name: String (nullable)
- manager_email: String (nullable)
- active: Boolean (default, index)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingAssignmentTemplate
- id: Integer (pk)
- organization_id: Integer (fk, index)
- department_id: Integer (fk, nullable, index)
- name: String
- title: String
- description: Text (nullable)
- required: Boolean (default)
- default_due_days: Integer (default)
- renewal_interval_days: Integer (nullable)
- notify_before_days: Integer (default)
- approval_required: Boolean (default)
- active: Boolean (default, index)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingRecurringRule
- id: Integer (pk)
- organization_id: Integer (fk, index)
- template_id: Integer (fk, index)
- department_id: Integer (fk, nullable, index)
- source: String (default)
- enabled: Boolean (default, index)
- lookback_days: Integer (default)
- last_run_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### TrainingRenewalNotificationLog
- id: Integer (pk)
- organization_id: Integer (fk, index)
- assignment_id: Integer (fk, index)
- recipient_email: String (index)
- status: String (default, index)
- attempts: Integer (default)
- error_message: Text (nullable)
- target_date: DateTime (nullable)
- sent_at: DateTime (nullable)
- created_at: DateTime

### CertificateTemplatePreset
- id: String (pk)
- scope_type: String (index)
- scope_id: Integer (index)
- name: String
- template_image_url: Text (nullable)
- config: JSONB (default)
- min_plan: String (default, index)
- enterprise_locked: Boolean (default, index)
- version: Integer (default)
- locked_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### CertificateTemplatePresetVersion
- id: Integer (pk)
- preset_id: String (fk, index)
- version: Integer (index)
- template_image_url: Text (nullable)
- config: JSONB (default)
- created_by: Integer (fk, nullable)
- created_at: DateTime

### CertificateTemplateRegressionSnapshot
- id: Integer (pk)
- preset_id: String (fk, index)
- scenario: String (index)
- render_hash: String
- payload: JSONB (default)
- created_at: DateTime

### EventAutomationRule
- id: String (pk)
- event_id: Integer (fk, index)
- name: String
- trigger: String (index)
- trigger_config: JSONB (default)
- enabled: Boolean (default, index)
- actions: JSONB (default)
- created_at: DateTime
- updated_at: DateTime

### EventAutomationDispatchState
- id: Integer (pk)
- event_id: Integer (fk, index)
- rule_id: String (index)
- state: JSONB (default)
- updated_at: DateTime

### EventAutomationExecutionLog
- id: Integer (pk)
- event_id: Integer (fk, index)
- rule_id: String (index)
- attendee_id: Integer (fk, nullable, index)
- recipient_email: String (nullable)
- action_index: Integer (default)
- action_type: String (index)
- idempotency_key: String
- status: String (default, index)
- attempts: Integer (default)
- next_attempt_at: DateTime (nullable, index)
- error_message: Text (nullable)
- response_status: Integer (nullable)
- payload: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- dispatched_at: DateTime (nullable)

### EventSavedAudienceSegment
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, nullable, index)
- name: String
- segment_key: String (index)
- filters: JSONB (default)
- visibility: String (default, index)
- last_count: Integer (default)
- last_computed_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### SegmentExportJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- segment_key: String (index)
- filters: JSONB (default)
- status: String (default, index)
- row_count: Integer (default)
- file_path: Text (nullable)
- file_name: String (nullable)
- sync_google_sheets: Boolean (default)
- google_spreadsheet_id: String (nullable)
- google_spreadsheet_url: Text (nullable)
- google_sheet_name: String (nullable)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)

### ParticipantCrmProfile
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- notes: Text (default)
- tags: JSONB (default)
- lifecycle_status: String (default, index)
- owner_user_id: Integer (fk, nullable, index)
- priority: String (default, index)
- lead_score: Integer (default, index)
- next_follow_up_at: DateTime (nullable, index)
- custom_fields: JSONB (default)
- created_at: DateTime
- updated_at: DateTime

### ParticipantCrmSnapshot
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- name: String (nullable)
- event_count: Integer (default)
- certificate_count: Integer (default)
- attended_count: Integer (default)
- survey_count: Integer (default)
- ticket_count: Integer (default)
- latest_activity_at: DateTime (nullable, index)
- computed_at: DateTime

### ParticipantCrmAuditLog
- id: Integer (pk)
- organization_id: Integer (fk, index)
- email: String (index)
- actor_user_id: Integer (fk, nullable, index)
- action: String (index)
- before: JSONB (nullable)
- after: JSONB (nullable)
- created_at: DateTime (index)

### ParticipantCrmSavedView
- id: Integer (pk)
- organization_id: Integer (fk, index)
- created_by: Integer (fk, nullable, index)
- name: String
- filters: JSONB (default)
- visibility: String (default, index)
- last_count: Integer (default)
- last_computed_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### ParticipantCrmEmailAlias
- id: Integer (pk)
- organization_id: Integer (fk, index)
- source_email: String (index)
- target_email: String (index)
- created_by: Integer (fk, nullable)
- created_at: DateTime

### MemberCertificatePreference
- id: Integer (pk)
- public_member_id: Integer (fk, unique, index)
- certificate_visibility: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### WalletAnalyticsEvent
- id: Integer (pk)
- public_member_id: Integer (fk, nullable, index)
- certificate_id: Integer (fk, nullable, index)
- event_type: String (index)
- source: String (default, index)
- ip_address: String (nullable)
- user_agent: Text (nullable)
- metadata_json: JSONB (default)
- created_at: DateTime (index)

### WalletPrivacyAuditLog
- id: Integer (pk)
- public_member_id: Integer (fk, index)
- actor_public_member_id: Integer (fk, nullable, index)
- action: String (index)
- before: JSONB (nullable)
- after: JSONB (nullable)
- ip_address: String (nullable)
- user_agent: Text (nullable)
- created_at: DateTime (index)

### ProductTelemetryEvent
- id: Integer (pk)
- user_id: Integer (fk, nullable, index)
- event_name: String (index)
- feature_key: String (index)
- resource_type: String (nullable, index)
- resource_id: String (nullable)
- metadata_json: JSONB (default)
- user_agent: Text (nullable)
- created_at: DateTime (index)

### CertificateShareCache
- id: Integer (pk)
- certificate_id: Integer (fk, index)
- cache_key: String (unique, index)
- image_path: Text (nullable)
- version_hash: String (index)
- invalidated_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime

### Transaction
- id: Integer (pk)
- user_id: int (fk, index)
- amount: Integer
- type: TxType (index)
- timestamp: DateTime
- description: String (nullable)
- _relations_: user: 

### SystemConfig
- key: String (pk)
- value: JSONB (default)

### RegistrationOptionCapacity
- id: Integer (pk)
- event_id: int (fk, index)
- field_id: String (index)
- option_label: String
- capacity: Integer (nullable)
- reserved_count: Integer (default)
- created_at: DateTime

### Order
- id: Integer (pk)
- user_id: Integer (fk, nullable)
- plan_id: String
- amount_cents: Integer
- currency: String (default)
- provider: String
- provider_ref: String (nullable)
- status: String (default)
- created_at: DateTime
- paid_at: DateTime (nullable)
- meta: JSONB (default)

### Subscription
- id: Integer (pk)
- user_id: Integer (fk)
- plan_id: String
- order_id: Integer (fk, nullable)
- started_at: DateTime
- expires_at: DateTime (nullable)
- is_active: Boolean (default)
- last_hc_credited_at: DateTime (nullable)

### ApiKey
- id: Integer (pk)
- user_id: Integer (fk)
- name: String
- key_prefix: String
- key_hash: String (unique)
- scopes: JSONB (default)
- is_active: Boolean (default)
- last_used_at: DateTime (nullable)
- expires_at: DateTime (nullable)
- created_at: DateTime
- rate_limit_per_min: Integer (nullable)

### TotpSecret
- user_id: Integer (fk, pk)
- secret: String
- enabled: Boolean (default)
- created_at: DateTime

### TotpBackupCode
- id: Integer (pk)
- user_id: Integer (fk, index)
- code_hash: String
- used_at: DateTime (nullable)
- created_at: DateTime

### AuditLog
- id: int (pk)
- user_id: Integer (fk, nullable)
- action: String
- resource_type: String (nullable)
- resource_id: String (nullable)
- ip_address: str (nullable)
- user_agent: Text (nullable)
- extra: JSONB (nullable)
- created_at: DateTime

### WebhookEndpoint
- id: Integer (pk)
- user_id: Integer (fk)
- url: Text
- events: JSONB (default)
- secret: String
- is_active: Boolean (default)
- created_at: DateTime
- last_fired_at: DateTime (nullable)

### WebhookDelivery
- id: int (pk)
- endpoint_id: Integer (fk)
- event_type: String
- payload: JSONB (default)
- status: String (default)
- http_status: Integer (nullable)
- response_body: Text (nullable)
- attempt: Integer (default)
- delivered_at: DateTime

### Organization
- id: Integer (pk)
- user_id: Integer (fk, unique)
- public_id: String (unique, index)
- org_name: String
- custom_domain: String (unique, nullable)
- brand_logo: Text (nullable)
- brand_color: String (default)
- settings: JSONB (default)
- created_at: DateTime

### OrganizationAllowlist
- id: Integer (pk)
- org_id: Integer (fk, index)
- email: String (index)
- created_at: DateTime

### OrganizationFollower
- id: Integer (pk)
- org_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- created_at: DateTime

### CommunityPost
- id: Integer (pk)
- public_id: String (unique, index)
- org_id: Integer (fk, index, nullable)
- author_user_id: Integer (fk, index, nullable)
- author_public_member_id: Integer (fk, index, nullable)
- body: Text
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CommunityPostLike
- id: Integer (pk)
- post_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- created_at: DateTime

### CommunityPostComment
- id: Integer (pk)
- post_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- parent_comment_id: Integer (fk, nullable, index)
- body: Text
- upvote_count: Integer (default)
- downvote_count: Integer (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### CommunityCommentVote
- id: Integer (pk)
- comment_id: Integer (fk, index)
- member_id: Integer (fk, index)
- vote_type: String
- created_at: DateTime
- updated_at: DateTime

### SupportTicket
- id: Integer (pk)
- organization_id: Integer (fk, index)
- user_id: Integer (fk, index)
- subject: String
- messages: JSONB (default)
- status: String (default, index)
- created_at: DateTime
- updated_at: DateTime

### WaitlistEntry
- id: Integer (pk)
- name: String
- email: String (unique)
- phone: String (nullable)
- plan_interest: String (nullable)
- note: Text (nullable)
- created_at: DateTime

### VerificationHit
- id: int (pk)
- cert_uuid: String
- viewed_at: DateTime
- ip_address: str (nullable)
- user_agent: Text (nullable)
- referer: Text (nullable)

### EventTemplateSnapshot
- id: Integer (pk)
- event_id: Integer (fk, index)
- template_image_url: Text (nullable)
- config: JSONB (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- _relations_: event: 

### UserEmailConfig
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- smtp_enabled: Boolean (default)
- smtp_host: String (nullable)
- smtp_port: Integer (nullable)
- smtp_use_tls: Boolean (default)
- smtp_user: String (nullable)
- smtp_password: String (nullable)
- from_email: String (nullable)
- from_name: String (nullable)
- reply_to: String (nullable)
- auto_cc: String (nullable)
- enable_tracking_pixel: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### UserGoogleIntegration
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- google_email: String (nullable)
- access_token: Text (nullable)
- refresh_token: Text (nullable)
- token_expires_at: DateTime (nullable)
- scopes: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### UserMicrosoftIntegration
- id: Integer (pk)
- user_id: Integer (fk, unique, index)
- microsoft_email: String (nullable)
- access_token: Text (nullable)
- refresh_token: Text (nullable)
- token_expires_at: DateTime (nullable)
- scopes: JSONB (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: user: 

### CertificateTemplate
- id: Integer (pk)
- name: String
- template_image_url: Text
- config: JSONB (default)
- is_default: Boolean (default)
- order_index: Integer (default)
- created_at: DateTime

### EmailTemplate
- id: Integer (pk)
- event_id: Integer (fk, index, nullable)
- created_by: Integer (fk, index)
- name: String
- subject_tr: String
- subject_en: String
- body_html: Text
- template_type: String (default)
- is_default: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , creator: 

### BulkEmailJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- email_template_id: Integer (fk, nullable)
- recipient_type: String (default)
- recipients_count: Integer (default)
- sent_count: Integer (default)
- failed_count: Integer (default)
- status: String (default)
- error_message: Text (nullable)
- scheduled_at: DateTime (nullable)
- cron_expression: String (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- _relations_: event: , creator: , email_template: 

### SuperadminBulkEmailJob
- id: Integer (pk)
- created_by: Integer (fk, index)
- source: String (default, index)
- job_kind: String (default, index)
- subject: String
- body_html: Text
- total_targets: Integer (default)
- sent_count: Integer (default)
- failed_count: Integer (default)
- status: String (default, index)
- cancel_requested: Boolean (default)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- completed_at: DateTime (nullable)
- _relations_: creator: 

### SystemEmailDigestConfig
- id: Integer (pk)
- enabled: Boolean (default)
- frequency: String (default)
- send_weekday: Integer (default)
- send_hour: Integer (default)
- max_events: Integer (default)
- max_posts: Integer (default)
- last_sent_at: DateTime (nullable)
- updated_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: updater: 

### BulkCertificateJob
- id: Integer (pk)
- event_id: Integer (fk, index)
- created_by: Integer (fk, index)
- names: JSONB (default)
- chunk_size: Integer (default)
- total_count: Integer (default)
- current_index: Integer (default)
- created_count: Integer (default)
- failed_count: Integer (default)
- already_exists_count: Integer (default)
- spent_heptacoin: Integer (default)
- generated_files: JSONB (default)
- zip_file_path: Text (nullable)
- status: String (default)
- error_message: Text (nullable)
- created_at: DateTime
- started_at: DateTime (nullable)
- updated_at: DateTime
- completed_at: DateTime (nullable)
- _relations_: event: , creator: 

### EmailDeliveryLog
- id: Integer (pk)
- bulk_job_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- recipient_email: String
- status: String (default)
- reason: Text (nullable)
- sent_at: DateTime
- opened_at: DateTime (nullable)
- clicked_at: DateTime (nullable)
- click_count: Integer (default)
- open_count: Integer (default)
- _relations_: bulk_job: , attendee: 

### WebhookSubscription
- id: Integer (pk)
- user_id: Integer (fk, index)
- event_type: String (index)
- url: Text
- secret: String (nullable)
- is_active: Boolean (default)
- created_at: DateTime
- _relations_: user: 

### WebhookLog
- id: Integer (pk)
- webhook_id: Integer (fk, index)
- event_type: String
- payload: JSONB (nullable)
- http_status: Integer (nullable)
- error_message: Text (nullable)
- sent_at: DateTime (index)
- _relations_: webhook: 

### EventSession
- id: Integer (pk)
- event_id: Integer (fk, index)
- name: String
- session_date: date_type (nullable)
- session_start: Any (nullable)
- session_location: String (nullable)
- checkin_token: String (unique)
- is_active: Boolean (default)
- enable_participation_test: Boolean (default)
- test_score_max: Integer (default)
- capacity: Integer (nullable)
- capacity_alert_threshold: Integer (default)
- created_at: DateTime
- _relations_: event: , attendaonce_records: 

### Attendee
- id: Integer (pk)
- event_id: Integer (fk, index)
- name: String
- email: String
- source: str (default)
- registered_at: DateTime
- email_verified: Boolean (default)
- email_verification_token: String (nullable)
- email_verified_at: DateTime (nullable)
- survey_completed_at: DateTime (nullable)
- survey_required: Boolean (default)
- can_download_cert: Boolean (default)
- public_member_id: Integer (fk, index, nullable)
- registration_answers: JSONB (nullable, default)
- unsubscribed_at: DateTime (nullable)
- _relations_: event: , public_member: , attendaonce_records: , tickets: 

### EventTicket
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- token: String (unique, index)
- qr_payload: Text
- status: String (default, index)
- issued_at: DateTime
- checked_in_at: DateTime (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , attendee: 

### EventComment
- id: Integer (pk)
- event_id: Integer (fk, index)
- public_member_id: Integer (fk, index)
- body: Text
- status: String (default, index)
- report_count: Integer (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: , public_member: 

### AttendaonceRecord
- id: Integer (pk)
- attendee_id: Integer (fk, index)
- session_id: Integer (fk, index)
- checked_in_at: DateTime
- ip_address: String (nullable)
- _relations_: attendee: , session: 

### CheckinActivityLog
- id: Integer (pk)
- event_id: Integer (fk, index)
- session_id: Integer (fk, nullable, index)
- attendee_id: Integer (fk, nullable, index)
- ticket_id: Integer (fk, nullable, index)
- actor_user_id: Integer (fk, nullable, index)
- method: String (default, index)
- source: String (default, index)
- entry_point: String (default, index)
- success: Boolean (default, index)
- duplicate: Boolean (default, index)
- invalid_reason: String (nullable, index)
- message: String (nullable)
- ip_address: String (nullable)
- created_at: DateTime (index)

### AgentActionLog
- id: BigInteger (pk)
- user_id: Integer (fk, index)
- api_key_prefix: String (nullable)
- tool_name: String
- event_id: Integer (nullable, index)
- payload: JSONB (nullable)
- result_summary: String (nullable)
- ip_address: String (nullable)
- created_at: DateTime

### CheckinKioskSession
- id: Integer (pk)
- event_id: Integer (fk, index)
- session_id: Integer (fk, nullable, index)
- token_hash: String (unique, index)
- label: String (default)
- created_by: Integer (fk, nullable, index)
- expires_at: DateTime (index)
- revoked_at: DateTime (nullable, index)
- last_seen_at: DateTime (nullable)
- created_at: DateTime

### CheckinNonce
- id: Integer (pk)
- event_id: Integer (fk, index)
- nonce: String (unique, index)
- actor_user_id: Integer (fk, nullable, index)
- kiosk_session_id: Integer (fk, nullable, index)
- expires_at: DateTime (index)
- used_at: DateTime (nullable, index)
- created_at: DateTime

### BadgeRule
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- badge_definitions: JSONB (default)
- enabled: Boolean (default)
- created_by: Integer (fk)
- updated_at: DateTime
- _relations_: event: , creator: 

### ParticipantBadge
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- badge_type: String
- criteria_met: JSONB (nullable)
- awarded_by: Integer (fk, nullable)
- awarded_at: DateTime
- is_automatic: Boolean (default)
- badge_metadata: JSONB (nullable)
- _relations_: event: , attendee: , awardedby: 

### EventRaffle
- id: Integer (pk)
- event_id: Integer (fk, index)
- title: String
- prize_name: String
- description: Text (nullable)
- min_sessions_required: Integer (default)
- winner_count: Integer (default)
- reserve_winner_count: Integer (default)
- status: String (default)
- created_by: Integer (fk)
- created_at: DateTime
- updated_at: DateTime
- drawn_at: DateTime (nullable)
- _relations_: event: , creator: , winners: 

### EventRaffleWinner
- id: Integer (pk)
- raffle_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- drawn_at: DateTime
- _relations_: raffle: , attendee: 

### CertificateTierRule
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- tier_definitions: JSONB (default)
- created_by: Integer (fk)
- updated_at: DateTime
- _relations_: event: , creator: 

### EventSurvey
- id: Integer (pk)
- event_id: Integer (fk, index, unique)
- is_required: Boolean (default)
- survey_type: String (default)
- builtin_questions: JSONB (nullable)
- external_provider: String (nullable)
- external_url: Text (nullable)
- external_webhook_key: String (nullable)
- created_at: DateTime
- updated_at: DateTime
- _relations_: event: 

### SurveyResponse
- id: Integer (pk)
- event_id: Integer (fk, index)
- attendee_id: Integer (fk, index)
- survey_type: String
- answers: JSONB (nullable)
- external_response_id: String (nullable)
- completed_at: DateTime
- completion_proof: JSONB (nullable)
- _relations_: event: , attendee: 

### SponsorSlot
- id: Integer (pk)
- event_id: Integer (fk, index)
- slot_position: String
- sponsor_name: String
- sponsor_logo_url: Text
- sponsor_website_url: Text
- sponsor_color_hex: String (default)
- enabled: Boolean (default)
- order_index: Integer (default)
- created_at: DateTime
- _relations_: event: 

### OAuthClient
- id: Integer (pk)
- client_id: String (unique)
- client_secret_hash: String
- name: String
- redirect_uris: JSONB (default)
- allowed_scopes: JSONB (default)
- logo_url: String (nullable)
- is_active: Boolean (default)
- created_at: DateTime (default)

### OAuthCode
- id: Integer (pk)
- code_hash: String (unique)
- client_id: String
- user_id: Integer
- redirect_uri: Text
- scopes: JSONB (default)
- code_challenge: String (nullable)
- code_challenge_method: String (nullable)
- expires_at: DateTime
- used: Boolean (default)
- created_at: DateTime (default)

### OAuthRefreshToken
- id: Integer (pk)
- token_hash: String (unique)
- client_id: String
- user_id: Integer
- scopes: JSONB (default)
- expires_at: DateTime
- revoked: Boolean (default)
- created_at: DateTime (default)

### OrganizationMember
- id: Integer (pk)
- organization_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String
- role: String (default)
- permissions: JSONB (nullable)
- status: String (default)
- invited_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrgStaff
- id: Integer (pk)
- org_id: Integer (fk, index)
- user_id: Integer (fk, nullable, index)
- email: String
- display_name: String (nullable)
- role: String
- department: String (nullable)
- is_active: Boolean
- invited_at: DateTime
- joined_at: DateTime (nullable)

### Quiz
- id: Integer (pk)
- event_id: Integer (fk, unique, index)
- title: String (default)
- description: Text (nullable)
- passing_score: Integer (default)
- max_attempts: Integer (default)
- time_limit_minutes: Integer (nullable)
- required_for_cert: Boolean (default)
- is_active: Boolean (default)
- created_at: DateTime
- updated_at: DateTime
- _relations_: questions: , attempts: 

### QuizQuestion
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- question_text: Text
- question_type: String (default)
- order: Integer (default)
- points: Integer (default)
- _relations_: quiz: , choices: , answers: 

### QuizChoice
- id: Integer (pk)
- question_id: Integer (fk, index)
- choice_text: Text
- is_correct: Boolean (default)
- order: Integer (default)
- _relations_: question: 

### QuizAttempt
- id: Integer (pk)
- quiz_id: Integer (fk, index)
- member_id: Integer (fk, nullable, index)
- attendee_name: String
- attendee_email: String (nullable, index)
- score: Integer (default)
- passed: Boolean (default)
- attempt_number: Integer (default)
- cert_issued: Boolean (default)
- started_at: DateTime
- completed_at: DateTime (nullable)
- _relations_: quiz: , answers: 

### QuizAnswer
- id: Integer (pk)
- attempt_id: Integer (fk, index)
- question_id: Integer (fk, index)
- selected_choice_id: Integer (fk, nullable)
- open_text_answer: Text (nullable)
- _relations_: attempt: , question: 

### ScheduledReport
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- report_type: String
- filters_json: JSONB (default)
- frequency: String (default)
- recipients_json: JSONB (default)
- active: Integer (default)
- last_run_at: DateTime (nullable)
- next_run_at: DateTime (nullable)
- created_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime

### OrgSsoConfig
- id: Integer (pk)
- org_id: Integer (fk, index)
- provider: String
- client_id: String (nullable)
- client_secret: String (nullable)
- tenant_id: String (nullable)
- redirect_uri: Text (nullable)
- extra_config_json: Text (nullable)
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime

### OrganizationVenue
- id: Integer (pk)
- organization_id: Integer (fk, index)
- name: String
- capacity: Integer
- location: String (nullable)
- notes: Text (nullable)
- is_active: Boolean (default)
- created_at: DateTime
- updated_at: DateTime

### VenueReservation
- id: Integer (pk)
- organization_id: Integer (fk, index)
- venue_id: Integer (fk, index)
- title: String
- description: Text (nullable)
- start_at: DateTime (index)
- end_at: DateTime (index)
- status: String (default, index)
- calendar_provider: String (default)
- external_event_id: String (nullable)
- created_by: Integer (fk)
- updated_by: Integer (fk, nullable)
- created_at: DateTime
- updated_at: DateTime
