# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**sqlalchemy** — 155 models

### AccreditationBody

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `short_code`: String _(unique)_
- `name`: String
- `logo_url`: Text _(nullable)_
- `verification_url_pattern`: Text _(nullable)_
- `created_at`: DateTime

### OrgAccreditation

pk: `id` (Integer) · fk: organization_id, body_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `body_id`: Integer _(fk)_
- `accreditation_number`: String _(nullable)_
- `valid_from`: DateTime _(nullable)_
- `valid_until`: DateTime _(nullable)_
- `documents_json`: JSONB _(nullable)_
- `notes`: Text _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### EventCpdConfig

pk: `id` (Integer) · fk: event_id, body_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, unique, index)_
- `body_id`: Integer _(fk)_
- `cpd_hours`: Numeric _(default)_
- `cpd_category`: String _(nullable)_
- `cpd_unit_type`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### MemberCpdLog

pk: `id` (Integer) · fk: member_id, event_id, body_id, certificate_id

- `id`: Integer _(pk)_
- `member_id`: Integer _(fk, index)_
- `event_id`: Integer _(fk)_
- `body_id`: Integer _(fk)_
- `cpd_hours`: Numeric
- `cpd_category`: String _(nullable)_
- `certificate_id`: Integer _(fk, nullable)_
- `earned_at`: DateTime

### AIDigestJob

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `user_id`: Integer
- `week_start`: Date
- `status`: String _(default)_
- `digest_html`: Text _(nullable)_
- `sent_at`: DateTime _(nullable)_
- `error`: String _(nullable)_
- `created_at`: DateTime _(default)_

### PublicMemberConnection

pk: `id` (Integer) · fk: follower_id, following_id

- `id`: Integer _(pk)_
- `follower_id`: Integer _(fk)_
- `following_id`: Integer _(fk)_
- `created_at`: DateTime _(default)_
- _relations_: follower: PublicMember, following: PublicMember

### PublicMemberConnectionRequest

pk: `id` (Integer) · fk: requester_id, recipient_id

- `id`: Integer _(pk)_
- `requester_id`: Integer _(fk)_
- `recipient_id`: Integer _(fk)_
- `status`: String _(default)_
- `created_at`: DateTime _(default)_
- `updated_at`: DateTime _(default)_
- _relations_: requester: PublicMember, recipient: PublicMember

### PublicMemberBlocklist

pk: `id` (Integer) · fk: blocker_id, blocked_id

- `id`: Integer _(pk)_
- `blocker_id`: Integer _(fk)_
- `blocked_id`: Integer _(fk)_
- `reason`: String _(nullable)_
- `created_at`: DateTime _(default)_
- _relations_: blocker: PublicMember, blocked: PublicMember

### CrmAccount

pk: `id` (Integer) · fk: organization_id, owner_user_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `domain`: String _(nullable)_
- `industry`: String _(nullable)_
- `size_bucket`: String _(nullable)_
- `owner_user_id`: Integer _(fk, nullable)_
- `annual_value`: Numeric _(nullable)_
- `notes`: Text _(default)_
- `tags`: JSONB _(default)_
- `status`: String _(default, index)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CrmAccountContact

pk: `id` (Integer) · fk: account_id, participant_crm_profile_id

- `id`: Integer _(pk)_
- `account_id`: Integer _(fk, index)_
- `participant_crm_profile_id`: Integer _(fk, index)_
- `role`: String _(nullable)_
- `is_primary`: Boolean _(default)_
- `created_at`: DateTime

### CrmDeal

pk: `id` (Integer) · fk: account_id, organization_id, owner_user_id

- `id`: Integer _(pk)_
- `account_id`: Integer _(fk, index)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `stage`: String _(default, index)_
- `amount`: Numeric _(nullable)_
- `expected_close_date`: DateTime _(nullable)_
- `owner_user_id`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CrmDealActivity

pk: `id` (Integer) · fk: deal_id, user_id

- `id`: Integer _(pk)_
- `deal_id`: Integer _(fk, index)_
- `activity_type`: String
- `content`: Text _(default)_
- `user_id`: Integer _(fk, nullable)_
- `activity_at`: DateTime _(index)_
- `created_at`: DateTime

### CrmEmailSequence

pk: `id` (Integer) · fk: organization_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `description`: Text _(nullable)_
- `active`: Boolean
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CrmSequenceStep

pk: `id` (Integer) · fk: sequence_id, email_template_id

- `id`: Integer _(pk)_
- `sequence_id`: Integer _(fk, index)_
- `step_order`: Integer
- `delay_days`: Integer
- `email_template_id`: Integer _(fk, nullable)_
- `subject_override`: String _(nullable)_
- `created_at`: DateTime

### CrmSequenceEnrollment

pk: `id` (Integer) · fk: sequence_id, organization_id

- `id`: Integer _(pk)_
- `sequence_id`: Integer _(fk, index)_
- `organization_id`: Integer _(fk, index)_
- `email`: String _(index)_
- `enrolled_at`: DateTime
- `current_step`: Integer
- `next_send_at`: DateTime _(nullable, index)_
- `status`: String
- `completed_at`: DateTime _(nullable)_
- `unenrolled_at`: DateTime _(nullable)_

### DocumentExportJob

pk: `id` (Integer) · fk: requested_by, organization_id

- `id`: Integer _(pk)_
- `export_type`: String _(index)_
- `export_format`: String _(default)_
- `requested_by`: Integer _(fk, index)_
- `organization_id`: Integer _(fk, nullable, index)_
- `filters`: JSONB _(default)_
- `status`: String _(default, index)_
- `row_count`: Integer _(default)_
- `output_file_path`: Text _(nullable)_
- `output_filename`: String _(nullable)_
- `error_message`: Text _(nullable)_
- `email_sent_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `started_at`: DateTime _(nullable)_
- `completed_at`: DateTime _(nullable)_

### Domain

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `domain`: String _(unique, index)_
- `owner`: String _(nullable)_
- `token`: String _(unique, index)_
- `status`: String _(default)_
- `created_at`: DateTime _(default)_

### EventTicketType

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `event_id`: Integer
- `name`: String
- `description`: Text _(nullable)_
- `price`: Numeric _(default)_
- `currency`: String _(default)_
- `capacity`: Integer _(nullable)_
- `sold_count`: Integer _(default)_
- `is_active`: Boolean _(default)_
- `sort_order`: Integer _(default)_
- `created_at`: DateTime _(default)_
- `updated_at`: DateTime _(default)_

### LeadCaptureForm

pk: `id` (Integer) · fk: organization_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `slug`: String _(unique, index)_
- `fields_json`: JSONB _(default)_
- `destination`: String _(default)_
- `auto_tag`: String _(nullable)_
- `redirect_url`: Text _(nullable)_
- `active`: Integer _(default)_
- `submission_count`: Integer _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime

### LeadCaptureSubmission

pk: `id` (Integer) · fk: form_id, organization_id

- `id`: Integer _(pk)_
- `form_id`: Integer _(fk, index)_
- `organization_id`: Integer _(fk, index)_
- `data_json`: JSONB _(default)_
- `source_url`: Text _(nullable)_
- `utm_source`: String _(nullable)_
- `utm_medium`: String _(nullable)_
- `utm_campaign`: String _(nullable)_
- `ip_addr`: String _(nullable)_
- `submitted_at`: DateTime _(index)_

### LearningPath

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk)_
- `name`: String
- `description`: Text _(nullable)_
- `thumbnail_url`: Text _(nullable)_
- `published`: Boolean _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: steps: , enrollments: 

### LearningPathStep

pk: `id` (Integer) · fk: path_id, event_id

- `id`: Integer _(pk)_
- `path_id`: Integer _(fk, index)_
- `event_id`: Integer _(fk, index)_
- `order`: Integer _(default)_
- `required`: Boolean _(default)_
- `min_score_override`: Integer _(nullable)_
- _relations_: path: , completions: 

### LearningPathEnrollment

pk: `id` (Integer) · fk: path_id, member_id

- `id`: Integer _(pk)_
- `path_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `enrolled_at`: DateTime
- `completed_at`: DateTime _(nullable)_
- `progress_pct`: Integer _(default)_
- _relations_: path: , step_completions: 

### LearningPathStepCompletion

pk: `id` (Integer) · fk: enrollment_id, step_id, certificate_id

- `id`: Integer _(pk)_
- `enrollment_id`: Integer _(fk, index)_
- `step_id`: Integer _(fk, index)_
- `certificate_id`: Integer _(fk, nullable)_
- `completed_at`: DateTime
- _relations_: enrollment: , step: 

### CourseGradeItem

pk: `id` (Integer) · fk: course_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `item_type`: String _(default)_
- `item_ref_id`: Integer _(nullable)_
- `title`: String
- `max_points`: Integer _(default)_
- `weight_pct`: Numeric _(default)_
- `order`: Integer _(default)_
- `created_at`: DateTime

### CourseGradeSummary

pk: `id` (Integer) · fk: enrollment_id

- `id`: Integer _(pk)_
- `enrollment_id`: Integer _(fk, unique)_
- `weighted_avg`: Numeric _(nullable)_
- `letter_grade`: String _(nullable)_
- `passed`: Boolean _(default)_
- `computed_at`: DateTime
- _relations_: enrollment: CourseEnrollment

### CourseDiscussion

pk: `id` (Integer) · fk: course_id, module_id, author_member_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `module_id`: Integer _(fk, nullable)_
- `author_member_id`: Integer _(fk, nullable)_
- `title`: String
- `body`: Text
- `is_pinned`: Boolean _(default)_
- `is_locked`: Boolean _(default)_
- `reply_count`: Integer _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: replies: 

### DiscussionReply

pk: `id` (Integer) · fk: discussion_id, parent_reply_id, author_member_id

- `id`: Integer _(pk)_
- `discussion_id`: Integer _(fk, index)_
- `parent_reply_id`: Integer _(fk, nullable)_
- `author_member_id`: Integer _(fk, nullable)_
- `body`: Text
- `is_instructor_reply`: Boolean _(default)_
- `created_at`: DateTime
- _relations_: discussion: 

### Rubric

pk: `id` (Integer) · fk: course_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `created_at`: DateTime
- _relations_: criteria: 

### RubricCriterion

pk: `id` (Integer) · fk: rubric_id

- `id`: Integer _(pk)_
- `rubric_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `points`: Integer _(default)_
- `order`: Integer _(default)_
- _relations_: rubric: , ratings: 

### RubricRating

pk: `id` (Integer) · fk: criterion_id

- `id`: Integer _(pk)_
- `criterion_id`: Integer _(fk, index)_
- `description`: String
- `points`: Integer _(default)_
- _relations_: criterion: 

### SubmissionRubricScore

pk: `id` (Integer) · fk: submission_id, criterion_id, rating_id

- `id`: Integer _(pk)_
- `submission_id`: Integer _(fk, index)_
- `criterion_id`: Integer _(fk, index)_
- `rating_id`: Integer _(fk, nullable)_
- `points_earned`: Integer _(default)_
- `comment`: Text _(nullable)_

### LearningOutcome

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `mastery_points`: Integer _(default)_
- `display_name`: String _(nullable)_
- `created_at`: DateTime
- _relations_: alignments: 

### CourseOutcomeAlignment

pk: `id` (Integer) · fk: course_id, outcome_id, module_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `outcome_id`: Integer _(fk, index)_
- `module_id`: Integer _(fk, nullable)_
- _relations_: outcome: 

### OutcomeMastery

pk: `id` (Integer) · fk: member_id, outcome_id

- `id`: Integer _(pk)_
- `member_id`: Integer _(fk, index)_
- `outcome_id`: Integer _(fk, index)_
- `score`: Integer _(default)_
- `mastered_at`: DateTime _(nullable)_
- `evidence_type`: String _(nullable)_
- `evidence_id`: Integer _(nullable)_

### CourseGroup

pk: `id` (Integer) · fk: course_id, created_by_user_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `name`: String
- `max_members`: Integer _(nullable)_
- `created_by_user_id`: Integer _(fk, nullable)_
- `created_at`: DateTime
- _relations_: members: 

### CourseGroupMember

pk: `id` (Integer) · fk: group_id, member_id

- `id`: Integer _(pk)_
- `group_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `joined_at`: DateTime
- _relations_: group: 

### Badge

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `name`: String
- `description`: Text _(nullable)_
- `image_url`: Text _(nullable)_
- `criteria_text`: Text _(nullable)_
- `trigger_type`: String _(default)_
- `trigger_ref_id`: Integer _(nullable)_
- `created_at`: DateTime
- _relations_: awards: 

### BadgeAward

pk: `id` (Integer) · fk: badge_id, member_id, issued_by_user_id

- `id`: Integer _(pk)_
- `badge_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `issued_at`: DateTime
- `evidence_url`: Text _(nullable)_
- `issued_by_user_id`: Integer _(fk, nullable)_
- _relations_: badge: 

### CourseCalendarEvent

pk: `id` (Integer) · fk: course_id, module_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `title`: String
- `event_type`: String _(default)_
- `starts_at`: DateTime
- `ends_at`: DateTime _(nullable)_
- `module_id`: Integer _(fk, nullable)_
- `conference_url`: Text _(nullable)_
- `description`: Text _(nullable)_
- `created_at`: DateTime

### CourseSyllabus

pk: `id` (Integer) · fk: course_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, unique)_
- `content_html`: Text _(default)_
- `updated_at`: DateTime

### CourseAttendanceSession

pk: `id` (Integer) · fk: course_id, created_by_user_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `title`: String
- `session_type`: String _(default)_
- `starts_at`: DateTime
- `ends_at`: DateTime _(nullable)_
- `location`: String _(nullable)_
- `required`: Boolean _(default)_
- `notes`: Text _(nullable)_
- `created_by_user_id`: Integer _(fk, nullable)_
- `created_at`: DateTime
- _relations_: records: 

### CourseAttendanceRecord

pk: `id` (Integer) · fk: session_id, enrollment_id, member_id, recorded_by_user_id

- `id`: Integer _(pk)_
- `session_id`: Integer _(fk, index)_
- `enrollment_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `status`: String _(default)_
- `minutes_attended`: Integer _(nullable)_
- `note`: Text _(nullable)_
- `recorded_by_user_id`: Integer _(fk, nullable)_
- `recorded_at`: DateTime
- _relations_: session: 

### EventLmsBridge

pk: `id` (Integer) · fk: event_id, course_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `course_id`: Integer _(fk, nullable)_
- `trigger_on`: String _(default)_
- `action`: String _(default)_
- `action_ref_id`: Integer _(nullable)_
- `is_active`: Boolean _(default)_
- `created_at`: DateTime

### LMSQuiz

pk: `id` (Integer) · fk: course_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `time_limit_minutes`: Integer _(nullable)_
- `attempts_allowed`: Integer _(default)_
- `passing_score`: Integer _(default)_
- `shuffle_questions`: Boolean _(default)_
- `show_correct_answers`: Boolean _(default)_
- `created_at`: DateTime
- _relations_: questions: , attempts: 

### LMSQuizQuestion

pk: `id` (Integer) · fk: quiz_id

- `id`: Integer _(pk)_
- `quiz_id`: Integer _(fk, index)_
- `question_text`: Text
- `question_type`: String _(default)_
- `points`: Integer _(default)_
- `order`: Integer _(default)_
- `explanation`: Text _(nullable)_
- _relations_: quiz: , choices: 

### LMSQuizChoice

pk: `id` (Integer) · fk: question_id

- `id`: Integer _(pk)_
- `question_id`: Integer _(fk, index)_
- `choice_text`: String
- `is_correct`: Boolean _(default)_
- `order`: Integer _(default)_
- _relations_: question: 

### LMSQuizAttempt

pk: `id` (Integer) · fk: quiz_id, member_id

- `id`: Integer _(pk)_
- `quiz_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `started_at`: DateTime
- `submitted_at`: DateTime _(nullable)_
- `score`: Numeric _(nullable)_
- `passed`: Boolean _(nullable)_
- `attempt_number`: Integer _(default)_
- _relations_: quiz: , answers: 

### LMSQuizAnswer

pk: `id` (Integer) · fk: attempt_id, question_id

- `id`: Integer _(pk)_
- `attempt_id`: Integer _(fk, index)_
- `question_id`: Integer _(fk, index)_
- `selected_choice_ids`: JSON _(nullable)_
- `text_answer`: Text _(nullable)_
- _relations_: attempt: 

### TrainingCourse

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk)_
- `title`: String
- `description`: Text _(nullable)_
- `thumbnail_url`: Text _(nullable)_
- `category`: String _(nullable)_
- `course_code`: String _(nullable)_
- `department`: String _(nullable)_
- `term`: String _(nullable)_
- `section`: String _(nullable)_
- `credits`: Numeric _(nullable)_
- `capacity`: Integer _(nullable)_
- `enrollment_policy`: String _(default)_
- `starts_at`: DateTime _(nullable)_
- `ends_at`: DateTime _(nullable)_
- `level`: String _(default)_
- `language`: String _(default)_
- `is_published`: Boolean _(default)_
- `is_featured`: Boolean _(default)_
- `price`: Numeric _(nullable)_
- `cert_template_url`: Text _(nullable)_
- `passing_score`: Integer _(nullable)_
- `is_marketplace_listed`: Boolean _(default)_
- `marketplace_price`: Numeric _(nullable)_
- `marketplace_description`: Text _(nullable)_
- `preview_video_url`: Text _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: modules: , enrollments: , announcements: 

### CourseModule

pk: `id` (Integer) · fk: course_id, quiz_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `order`: Integer _(default)_
- `content_type`: String _(default)_
- `content_url`: Text _(nullable)_
- `content_text`: Text _(nullable)_
- `duration_minutes`: Integer _(nullable)_
- `is_required`: Boolean _(default)_
- `quiz_id`: Integer _(fk, nullable)_
- `created_at`: DateTime
- _relations_: course: , progress_records: , assignment: 

### CourseEnrollment

pk: `id` (Integer) · fk: course_id, member_id, certificate_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `enrolled_at`: DateTime
- `completed_at`: DateTime _(nullable)_
- `progress_pct`: Integer _(default)_
- `final_grade`: Integer _(nullable)_
- `certificate_id`: Integer _(fk, nullable)_
- `cert_pdf_url`: Text _(nullable)_
- `status`: String _(default, index)_
- _relations_: course: , module_progress: , grade_summary: CourseGradeSummary

### ModuleProgress

pk: `id` (Integer) · fk: enrollment_id, module_id

- `id`: Integer _(pk)_
- `enrollment_id`: Integer _(fk, index)_
- `module_id`: Integer _(fk, index)_
- `started_at`: DateTime _(nullable)_
- `completed_at`: DateTime _(nullable)_
- `time_spent_seconds`: Integer _(default)_
- `quiz_score`: Integer _(nullable)_
- _relations_: enrollment: , module: 

### CourseAssignment

pk: `id` (Integer) · fk: module_id

- `id`: Integer _(pk)_
- `module_id`: Integer _(fk, index, unique)_
- `instructions`: Text _(nullable)_
- `due_date`: DateTime _(nullable)_
- `max_points`: Integer _(default)_
- `submission_type`: String _(default)_
- _relations_: module: , submissions: 

### AssignmentSubmission

pk: `id` (Integer) · fk: assignment_id, member_id, graded_by_user_id

- `id`: Integer _(pk)_
- `assignment_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `submitted_at`: DateTime
- `submission_text`: Text _(nullable)_
- `submission_url`: Text _(nullable)_
- `file_url`: Text _(nullable)_
- `grade`: Integer _(nullable)_
- `feedback`: Text _(nullable)_
- `graded_at`: DateTime _(nullable)_
- `graded_by_user_id`: Integer _(fk, nullable)_
- _relations_: assignment: 

### LmsJourney

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk)_
- `title`: String
- `description`: Text _(nullable)_
- `thumbnail_url`: Text _(nullable)_
- `is_published`: Boolean _(default)_
- `cert_template_url`: Text _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: steps: , enrollments: 

### LmsJourneyStep

pk: `id` (Integer) · fk: journey_id, course_id

- `id`: Integer _(pk)_
- `journey_id`: Integer _(fk, index)_
- `course_id`: Integer _(fk, index)_
- `order`: Integer _(default)_
- `is_required`: Boolean _(default)_
- _relations_: journey: 

### LmsJourneyEnrollment

pk: `id` (Integer) · fk: journey_id, member_id, certificate_id

- `id`: Integer _(pk)_
- `journey_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `enrolled_at`: DateTime
- `completed_at`: DateTime _(nullable)_
- `progress_pct`: Integer _(default)_
- `certificate_id`: Integer _(fk, nullable)_
- `cert_pdf_url`: Text _(nullable)_
- _relations_: journey: 

### CourseAnnouncement

pk: `id` (Integer) · fk: course_id, author_user_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `author_user_id`: Integer _(fk, index)_
- `title`: String
- `body`: Text
- `created_at`: DateTime
- _relations_: course: 

### OrgLmsStaff

pk: `id` (Integer) · fk: org_id, user_id, course_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `user_id`: Integer _(fk, index)_
- `role`: String _(default)_
- `course_id`: Integer _(fk, nullable)_
- `created_at`: DateTime

### CourseCpdConfig

pk: `id` (Integer) · fk: course_id

- `id`: Integer _(pk)_
- `course_id`: Integer _(fk, index)_
- `accreditation_body_id`: Integer _(nullable)_
- `cpd_hours`: Numeric _(default)_
- `cpd_category`: String _(nullable)_

### LtiTool

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `name`: String
- `launch_url`: Text
- `consumer_key`: String _(nullable)_
- `shared_secret`: String _(nullable)_
- `custom_params_json`: Text _(nullable)_
- `provider`: String
- `is_active`: Boolean
- `created_at`: DateTime

### User

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `email`: String _(unique, index)_
- `password_hash`: String
- `role`: Role _(index)_
- `heptacoin_balaonce`: Integer _(default)_
- `created_at`: DateTime
- `deleted_at`: DateTime _(nullable, index)_
- `is_verified`: Boolean _(default)_
- `verification_token`: String _(nullable)_
- `password_reset_token`: String _(nullable)_
- `magic_link_token`: String _(nullable)_
- _relations_: events: , transactions: , email_config: , google_integration: , ms365_integration: 

### PublicMember

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `public_id`: String _(unique, index)_
- `email`: String _(unique, index)_
- `display_name`: String
- `bio`: Text _(nullable)_
- `avatar_url`: Text _(nullable)_
- `headline`: String _(nullable)_
- `location`: String _(nullable)_
- `website_url`: String _(nullable)_
- `contact_email`: String _(nullable)_
- `digest_opt_in`: Boolean _(default, index)_
- `password_hash`: String
- `created_at`: DateTime
- `deleted_at`: DateTime _(nullable, index)_
- `is_verified`: Boolean _(default)_
- `verification_token`: String _(nullable)_
- `password_reset_token`: String _(nullable)_
- _relations_: attendees: , comments: 

### Event

pk: `id` (Integer) · fk: admin_id

- `id`: Integer _(pk)_
- `public_id`: String _(unique, index, nullable)_
- `admin_id`: int _(fk, index)_
- `name`: String
- `template_image_url`: Text
- `config`: JSONB _(default)_
- `created_at`: DateTime
- `cert_seq`: Integer _(default)_
- `event_date`: date_type _(nullable)_
- `event_description`: Text _(nullable)_
- `event_location`: String _(nullable)_
- `min_sessions_required`: Integer _(default)_
- `event_banner_url`: Text _(nullable)_
- `auto_email_on_cert`: Boolean _(default)_
- `cert_email_template_id`: Integer _(nullable)_
- `event_type`: String _(default)_
- `certificate_enabled`: Boolean _(default)_
- `checkin_enabled`: Boolean _(default)_
- `ticketing_enabled`: Boolean _(default)_
- `registration_enabled`: Boolean _(default)_
- `raffles_enabled`: Boolean _(default)_
- `gamification_enabled`: Boolean _(default)_
- `requires_approval`: Boolean _(default)_
- `quiz_enabled`: Boolean _(default)_
- `cpd_enabled`: Boolean _(default)_
- `is_marketplace_listed`: Boolean _(default)_
- `marketplace_category`: String _(nullable)_
- `marketplace_description`: Text _(nullable)_
- `marketplace_price`: Numeric _(nullable)_
- _relations_: admin: , certificates: , sessions: , attendees: , tickets: , comments: , raffles: , template_snapshots: , email_templates: , bulk_email_jobs: , bulk_certificate_jobs: , team_members: 

### EventTeamMember

pk: `id` (Integer) · fk: event_id, user_id, invited_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `user_id`: Integer _(fk, nullable, index)_
- `email`: String _(index)_
- `role`: String _(default, index)_
- `permissions`: JSONB _(nullable)_
- `status`: String _(default, index)_
- `invited_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: event: , user: , inviter: 

### Certificate

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `uuid`: String _(unique, index)_
- `student_name`: String
- `event_id`: int _(fk, index)_
- `pdf_url`: Text
- `status`: CertStatus _(default)_
- `created_at`: DateTime
- `public_id`: String _(nullable)_
- `issued_at`: DateTime
- `hosting_term`: String _(default)_
- `hosting_ends_at`: DateTime _(nullable)_
- `auto_renew_enabled`: Boolean _(default)_
- `asset_size_bytes`: Integer _(default)_
- `deleted_at`: DateTime _(nullable)_
- `certificate_tier`: String _(nullable)_
- `tier_template_id`: Integer _(nullable)_
- `survey_required`: Boolean _(default)_
- `worldpass_anchor_id`: String _(nullable)_
- _relations_: event: 

### TrainingAssignment

pk: `id` (Integer) · fk: organization_id, event_id, course_id, renewal_event_id, certificate_id, department_id, approved_by, template_id, recurring_rule_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `event_id`: Integer _(fk, nullable, index)_
- `course_id`: Integer _(fk, nullable, index)_
- `renewal_event_id`: Integer _(fk, nullable, index)_
- `certificate_id`: Integer _(fk, nullable, index)_
- `title`: String
- `description`: Text _(nullable)_
- `assignee_name`: String
- `assignee_email`: String _(index)_
- `department_id`: Integer _(fk, nullable, index)_
- `department`: String _(nullable, index)_
- `manager_email`: String _(nullable, index)_
- `approval_status`: String _(default, index)_
- `approved_by`: Integer _(fk, nullable)_
- `approved_at`: DateTime _(nullable)_
- `evidence_url`: Text _(nullable)_
- `evidence_label`: String _(nullable)_
- `template_id`: Integer _(fk, nullable, index)_
- `recurring_rule_id`: Integer _(fk, nullable, index)_
- `required`: Boolean _(default, index)_
- `status`: String _(default, index)_
- `due_at`: DateTime _(nullable, index)_
- `completed_at`: DateTime _(nullable)_
- `renewal_due_at`: DateTime _(nullable, index)_
- `notify_before_days`: Integer _(default)_
- `last_notified_at`: DateTime _(nullable)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### OrganizationDepartment

pk: `id` (Integer) · fk: organization_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `code`: String _(nullable)_
- `manager_name`: String _(nullable)_
- `manager_email`: String _(nullable)_
- `active`: Boolean _(default, index)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### TrainingAssignmentTemplate

pk: `id` (Integer) · fk: organization_id, department_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `department_id`: Integer _(fk, nullable, index)_
- `name`: String
- `title`: String
- `description`: Text _(nullable)_
- `required`: Boolean _(default)_
- `default_due_days`: Integer _(default)_
- `renewal_interval_days`: Integer _(nullable)_
- `notify_before_days`: Integer _(default)_
- `approval_required`: Boolean _(default)_
- `active`: Boolean _(default, index)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### TrainingRecurringRule

pk: `id` (Integer) · fk: organization_id, template_id, department_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `template_id`: Integer _(fk, index)_
- `department_id`: Integer _(fk, nullable, index)_
- `source`: String _(default)_
- `enabled`: Boolean _(default, index)_
- `lookback_days`: Integer _(default)_
- `last_run_at`: DateTime _(nullable)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### TrainingRenewalNotificationLog

pk: `id` (Integer) · fk: organization_id, assignment_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `assignment_id`: Integer _(fk, index)_
- `recipient_email`: String _(index)_
- `status`: String _(default, index)_
- `attempts`: Integer _(default)_
- `error_message`: Text _(nullable)_
- `target_date`: DateTime _(nullable)_
- `sent_at`: DateTime _(nullable)_
- `created_at`: DateTime

### CertificateTemplatePreset

pk: `id` (String) · fk: locked_by

- `id`: String _(pk)_
- `scope_type`: String _(index)_
- `scope_id`: Integer _(index)_
- `name`: String
- `template_image_url`: Text _(nullable)_
- `config`: JSONB _(default)_
- `min_plan`: String _(default, index)_
- `enterprise_locked`: Boolean _(default, index)_
- `version`: Integer _(default)_
- `locked_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CertificateTemplatePresetVersion

pk: `id` (Integer) · fk: preset_id, created_by

- `id`: Integer _(pk)_
- `preset_id`: String _(fk, index)_
- `version`: Integer _(index)_
- `template_image_url`: Text _(nullable)_
- `config`: JSONB _(default)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime

### CertificateTemplateRegressionSnapshot

pk: `id` (Integer) · fk: preset_id

- `id`: Integer _(pk)_
- `preset_id`: String _(fk, index)_
- `scenario`: String _(index)_
- `render_hash`: String
- `payload`: JSONB _(default)_
- `created_at`: DateTime

### EventAutomationRule

pk: `id` (String) · fk: event_id

- `id`: String _(pk)_
- `event_id`: Integer _(fk, index)_
- `name`: String
- `trigger`: String _(index)_
- `trigger_config`: JSONB _(default)_
- `enabled`: Boolean _(default, index)_
- `actions`: JSONB _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime

### EventAutomationDispatchState

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `rule_id`: String _(index)_
- `state`: JSONB _(default)_
- `updated_at`: DateTime

### EventAutomationExecutionLog

pk: `id` (Integer) · fk: event_id, attendee_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `rule_id`: String _(index)_
- `attendee_id`: Integer _(fk, nullable, index)_
- `recipient_email`: String _(nullable)_
- `action_index`: Integer _(default)_
- `action_type`: String _(index)_
- `idempotency_key`: String
- `status`: String _(default, index)_
- `attempts`: Integer _(default)_
- `next_attempt_at`: DateTime _(nullable, index)_
- `error_message`: Text _(nullable)_
- `response_status`: Integer _(nullable)_
- `payload`: JSONB _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- `dispatched_at`: DateTime _(nullable)_

### EventSavedAudienceSegment

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `created_by`: Integer _(fk, nullable, index)_
- `name`: String
- `segment_key`: String _(index)_
- `filters`: JSONB _(default)_
- `visibility`: String _(default, index)_
- `last_count`: Integer _(default)_
- `last_computed_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### SegmentExportJob

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `created_by`: Integer _(fk, index)_
- `segment_key`: String _(index)_
- `filters`: JSONB _(default)_
- `status`: String _(default, index)_
- `row_count`: Integer _(default)_
- `file_path`: Text _(nullable)_
- `file_name`: String _(nullable)_
- `sync_google_sheets`: Boolean _(default)_
- `google_spreadsheet_id`: String _(nullable)_
- `google_spreadsheet_url`: Text _(nullable)_
- `google_sheet_name`: String _(nullable)_
- `error_message`: Text _(nullable)_
- `created_at`: DateTime
- `started_at`: DateTime _(nullable)_
- `completed_at`: DateTime _(nullable)_

### ParticipantCrmProfile

pk: `id` (Integer) · fk: organization_id, owner_user_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `email`: String _(index)_
- `notes`: Text _(default)_
- `tags`: JSONB _(default)_
- `lifecycle_status`: String _(default, index)_
- `owner_user_id`: Integer _(fk, nullable, index)_
- `priority`: String _(default, index)_
- `lead_score`: Integer _(default, index)_
- `next_follow_up_at`: DateTime _(nullable, index)_
- `custom_fields`: JSONB _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime

### ParticipantCrmSnapshot

pk: `id` (Integer) · fk: organization_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `email`: String _(index)_
- `name`: String _(nullable)_
- `event_count`: Integer _(default)_
- `certificate_count`: Integer _(default)_
- `attended_count`: Integer _(default)_
- `survey_count`: Integer _(default)_
- `ticket_count`: Integer _(default)_
- `latest_activity_at`: DateTime _(nullable, index)_
- `computed_at`: DateTime

### ParticipantCrmAuditLog

pk: `id` (Integer) · fk: organization_id, actor_user_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `email`: String _(index)_
- `actor_user_id`: Integer _(fk, nullable, index)_
- `action`: String _(index)_
- `before`: JSONB _(nullable)_
- `after`: JSONB _(nullable)_
- `created_at`: DateTime _(index)_

### ParticipantCrmSavedView

pk: `id` (Integer) · fk: organization_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `created_by`: Integer _(fk, nullable, index)_
- `name`: String
- `filters`: JSONB _(default)_
- `visibility`: String _(default, index)_
- `last_count`: Integer _(default)_
- `last_computed_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### ParticipantCrmEmailAlias

pk: `id` (Integer) · fk: organization_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `source_email`: String _(index)_
- `target_email`: String _(index)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime

### MemberCertificatePreference

pk: `id` (Integer) · fk: public_member_id

- `id`: Integer _(pk)_
- `public_member_id`: Integer _(fk, unique, index)_
- `certificate_visibility`: String _(default, index)_
- `created_at`: DateTime
- `updated_at`: DateTime

### WalletAnalyticsEvent

pk: `id` (Integer) · fk: public_member_id, certificate_id

- `id`: Integer _(pk)_
- `public_member_id`: Integer _(fk, nullable, index)_
- `certificate_id`: Integer _(fk, nullable, index)_
- `event_type`: String _(index)_
- `source`: String _(default, index)_
- `ip_address`: String _(nullable)_
- `user_agent`: Text _(nullable)_
- `metadata_json`: JSONB _(default)_
- `created_at`: DateTime _(index)_

### WalletPrivacyAuditLog

pk: `id` (Integer) · fk: public_member_id, actor_public_member_id

- `id`: Integer _(pk)_
- `public_member_id`: Integer _(fk, index)_
- `actor_public_member_id`: Integer _(fk, nullable, index)_
- `action`: String _(index)_
- `before`: JSONB _(nullable)_
- `after`: JSONB _(nullable)_
- `ip_address`: String _(nullable)_
- `user_agent`: Text _(nullable)_
- `created_at`: DateTime _(index)_

### ProductTelemetryEvent

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, nullable, index)_
- `event_name`: String _(index)_
- `feature_key`: String _(index)_
- `resource_type`: String _(nullable, index)_
- `resource_id`: String _(nullable)_
- `metadata_json`: JSONB _(default)_
- `user_agent`: Text _(nullable)_
- `created_at`: DateTime _(index)_

### CertificateShareCache

pk: `id` (Integer) · fk: certificate_id

- `id`: Integer _(pk)_
- `certificate_id`: Integer _(fk, index)_
- `cache_key`: String _(unique, index)_
- `image_path`: Text _(nullable)_
- `version_hash`: String _(index)_
- `invalidated_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### Transaction

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: int _(fk, index)_
- `amount`: Integer
- `type`: TxType _(index)_
- `timestamp`: DateTime
- `description`: String _(nullable)_
- _relations_: user: 

### SystemConfig

pk: `key` (String)

- `key`: String _(pk)_
- `value`: JSONB _(default)_

### RegistrationOptionCapacity

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: int _(fk, index)_
- `field_id`: String _(index)_
- `option_label`: String
- `capacity`: Integer _(nullable)_
- `reserved_count`: Integer _(default)_
- `created_at`: DateTime

### Order

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, nullable)_
- `plan_id`: String
- `amount_cents`: Integer
- `currency`: String _(default)_
- `provider`: String
- `provider_ref`: String _(nullable)_
- `status`: String _(default)_
- `created_at`: DateTime
- `paid_at`: DateTime _(nullable)_
- `meta`: JSONB _(default)_

### Subscription

pk: `id` (Integer) · fk: user_id, order_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk)_
- `plan_id`: String
- `order_id`: Integer _(fk, nullable)_
- `started_at`: DateTime
- `expires_at`: DateTime _(nullable)_
- `is_active`: Boolean _(default)_
- `last_hc_credited_at`: DateTime _(nullable)_

### ApiKey

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk)_
- `name`: String
- `key_prefix`: String
- `key_hash`: String _(unique)_
- `scopes`: JSONB _(default)_
- `is_active`: Boolean _(default)_
- `last_used_at`: DateTime _(nullable)_
- `expires_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `rate_limit_per_min`: Integer _(nullable)_

### TotpSecret

pk: `user_id` (Integer) · fk: user_id

- `user_id`: Integer _(fk, pk)_
- `secret`: String
- `enabled`: Boolean _(default)_
- `created_at`: DateTime

### TotpBackupCode

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, index)_
- `code_hash`: String
- `used_at`: DateTime _(nullable)_
- `created_at`: DateTime

### AuditLog

pk: `id` (int) · fk: user_id

- `id`: int _(pk)_
- `user_id`: Integer _(fk, nullable)_
- `action`: String
- `resource_type`: String _(nullable)_
- `resource_id`: String _(nullable)_
- `ip_address`: str _(nullable)_
- `user_agent`: Text _(nullable)_
- `extra`: JSONB _(nullable)_
- `created_at`: DateTime

### WebhookEndpoint

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk)_
- `url`: Text
- `events`: JSONB _(default)_
- `secret`: String
- `is_active`: Boolean _(default)_
- `created_at`: DateTime
- `last_fired_at`: DateTime _(nullable)_

### WebhookDelivery

pk: `id` (int) · fk: endpoint_id

- `id`: int _(pk)_
- `endpoint_id`: Integer _(fk)_
- `event_type`: String
- `payload`: JSONB _(default)_
- `status`: String _(default)_
- `http_status`: Integer _(nullable)_
- `response_body`: Text _(nullable)_
- `attempt`: Integer _(default)_
- `delivered_at`: DateTime

### Organization

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, unique)_
- `public_id`: String _(unique, index)_
- `org_name`: String
- `custom_domain`: String _(unique, nullable)_
- `brand_logo`: Text _(nullable)_
- `brand_color`: String _(default)_
- `settings`: JSONB _(default)_
- `created_at`: DateTime

### OrganizationAllowlist

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `email`: String _(index)_
- `created_at`: DateTime

### OrganizationFollower

pk: `id` (Integer) · fk: org_id, public_member_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `public_member_id`: Integer _(fk, index)_
- `created_at`: DateTime

### CommunityPost

pk: `id` (Integer) · fk: org_id, author_user_id, author_public_member_id

- `id`: Integer _(pk)_
- `public_id`: String _(unique, index)_
- `org_id`: Integer _(fk, index, nullable)_
- `author_user_id`: Integer _(fk, index, nullable)_
- `author_public_member_id`: Integer _(fk, index, nullable)_
- `body`: Text
- `status`: String _(default, index)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CommunityPostLike

pk: `id` (Integer) · fk: post_id, public_member_id

- `id`: Integer _(pk)_
- `post_id`: Integer _(fk, index)_
- `public_member_id`: Integer _(fk, index)_
- `created_at`: DateTime

### CommunityPostComment

pk: `id` (Integer) · fk: post_id, public_member_id, parent_comment_id

- `id`: Integer _(pk)_
- `post_id`: Integer _(fk, index)_
- `public_member_id`: Integer _(fk, index)_
- `parent_comment_id`: Integer _(fk, nullable, index)_
- `body`: Text
- `upvote_count`: Integer _(default)_
- `downvote_count`: Integer _(default)_
- `status`: String _(default, index)_
- `created_at`: DateTime
- `updated_at`: DateTime

### CommunityCommentVote

pk: `id` (Integer) · fk: comment_id, member_id

- `id`: Integer _(pk)_
- `comment_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, index)_
- `vote_type`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### SupportTicket

pk: `id` (Integer) · fk: organization_id, user_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `user_id`: Integer _(fk, index)_
- `subject`: String
- `messages`: JSONB _(default)_
- `status`: String _(default, index)_
- `created_at`: DateTime
- `updated_at`: DateTime

### WaitlistEntry

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `name`: String
- `email`: String _(unique)_
- `phone`: String _(nullable)_
- `plan_interest`: String _(nullable)_
- `note`: Text _(nullable)_
- `created_at`: DateTime

### VerificationHit

pk: `id` (int)

- `id`: int _(pk)_
- `cert_uuid`: String
- `viewed_at`: DateTime
- `ip_address`: str _(nullable)_
- `user_agent`: Text _(nullable)_
- `referer`: Text _(nullable)_

### EventTemplateSnapshot

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `template_image_url`: Text _(nullable)_
- `config`: JSONB _(nullable)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- _relations_: event: 

### UserEmailConfig

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, unique, index)_
- `smtp_enabled`: Boolean _(default)_
- `smtp_host`: String _(nullable)_
- `smtp_port`: Integer _(nullable)_
- `smtp_use_tls`: Boolean _(default)_
- `smtp_user`: String _(nullable)_
- `smtp_password`: String _(nullable)_
- `from_email`: String _(nullable)_
- `from_name`: String _(nullable)_
- `reply_to`: String _(nullable)_
- `auto_cc`: String _(nullable)_
- `enable_tracking_pixel`: Boolean _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: user: 

### UserGoogleIntegration

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, unique, index)_
- `google_email`: String _(nullable)_
- `access_token`: Text _(nullable)_
- `refresh_token`: Text _(nullable)_
- `token_expires_at`: DateTime _(nullable)_
- `scopes`: JSONB _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: user: 

### UserMicrosoftIntegration

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, unique, index)_
- `microsoft_email`: String _(nullable)_
- `access_token`: Text _(nullable)_
- `refresh_token`: Text _(nullable)_
- `token_expires_at`: DateTime _(nullable)_
- `scopes`: JSONB _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: user: 

### CertificateTemplate

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `name`: String
- `template_image_url`: Text
- `config`: JSONB _(default)_
- `is_default`: Boolean _(default)_
- `order_index`: Integer _(default)_
- `created_at`: DateTime

### EmailTemplate

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index, nullable)_
- `created_by`: Integer _(fk, index)_
- `name`: String
- `subject_tr`: String
- `subject_en`: String
- `body_html`: Text
- `template_type`: String _(default)_
- `is_default`: Boolean _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: event: , creator: 

### BulkEmailJob

pk: `id` (Integer) · fk: event_id, created_by, email_template_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `created_by`: Integer _(fk, index)_
- `email_template_id`: Integer _(fk, nullable)_
- `recipient_type`: String _(default)_
- `recipients_count`: Integer _(default)_
- `sent_count`: Integer _(default)_
- `failed_count`: Integer _(default)_
- `status`: String _(default)_
- `error_message`: Text _(nullable)_
- `scheduled_at`: DateTime _(nullable)_
- `cron_expression`: String _(nullable)_
- `created_at`: DateTime
- `started_at`: DateTime _(nullable)_
- `completed_at`: DateTime _(nullable)_
- _relations_: event: , creator: , email_template: 

### SuperadminBulkEmailJob

pk: `id` (Integer) · fk: created_by

- `id`: Integer _(pk)_
- `created_by`: Integer _(fk, index)_
- `source`: String _(default, index)_
- `job_kind`: String _(default, index)_
- `subject`: String
- `body_html`: Text
- `total_targets`: Integer _(default)_
- `sent_count`: Integer _(default)_
- `failed_count`: Integer _(default)_
- `status`: String _(default, index)_
- `cancel_requested`: Boolean _(default)_
- `error_message`: Text _(nullable)_
- `created_at`: DateTime
- `started_at`: DateTime _(nullable)_
- `completed_at`: DateTime _(nullable)_
- _relations_: creator: 

### SystemEmailDigestConfig

pk: `id` (Integer) · fk: updated_by

- `id`: Integer _(pk)_
- `enabled`: Boolean _(default)_
- `frequency`: String _(default)_
- `send_weekday`: Integer _(default)_
- `send_hour`: Integer _(default)_
- `max_events`: Integer _(default)_
- `max_posts`: Integer _(default)_
- `last_sent_at`: DateTime _(nullable)_
- `updated_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: updater: 

### BulkCertificateJob

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `created_by`: Integer _(fk, index)_
- `names`: JSONB _(default)_
- `chunk_size`: Integer _(default)_
- `total_count`: Integer _(default)_
- `current_index`: Integer _(default)_
- `created_count`: Integer _(default)_
- `failed_count`: Integer _(default)_
- `already_exists_count`: Integer _(default)_
- `spent_heptacoin`: Integer _(default)_
- `generated_files`: JSONB _(default)_
- `zip_file_path`: Text _(nullable)_
- `status`: String _(default)_
- `error_message`: Text _(nullable)_
- `created_at`: DateTime
- `started_at`: DateTime _(nullable)_
- `updated_at`: DateTime
- `completed_at`: DateTime _(nullable)_
- _relations_: event: , creator: 

### EmailDeliveryLog

pk: `id` (Integer) · fk: bulk_job_id, attendee_id

- `id`: Integer _(pk)_
- `bulk_job_id`: Integer _(fk, index)_
- `attendee_id`: Integer _(fk, index)_
- `recipient_email`: String
- `status`: String _(default)_
- `reason`: Text _(nullable)_
- `sent_at`: DateTime
- `opened_at`: DateTime _(nullable)_
- `clicked_at`: DateTime _(nullable)_
- `click_count`: Integer _(default)_
- `open_count`: Integer _(default)_
- _relations_: bulk_job: , attendee: 

### WebhookSubscription

pk: `id` (Integer) · fk: user_id

- `id`: Integer _(pk)_
- `user_id`: Integer _(fk, index)_
- `event_type`: String _(index)_
- `url`: Text
- `secret`: String _(nullable)_
- `is_active`: Boolean _(default)_
- `created_at`: DateTime
- _relations_: user: 

### WebhookLog

pk: `id` (Integer) · fk: webhook_id

- `id`: Integer _(pk)_
- `webhook_id`: Integer _(fk, index)_
- `event_type`: String
- `payload`: JSONB _(nullable)_
- `http_status`: Integer _(nullable)_
- `error_message`: Text _(nullable)_
- `sent_at`: DateTime _(index)_
- _relations_: webhook: 

### EventSession

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `name`: String
- `session_date`: date_type _(nullable)_
- `session_start`: Any _(nullable)_
- `session_location`: String _(nullable)_
- `checkin_token`: String _(unique)_
- `is_active`: Boolean _(default)_
- `enable_participation_test`: Boolean _(default)_
- `test_score_max`: Integer _(default)_
- `capacity`: Integer _(nullable)_
- `capacity_alert_threshold`: Integer _(default)_
- `created_at`: DateTime
- _relations_: event: , attendaonce_records: 

### Attendee

pk: `id` (Integer) · fk: event_id, public_member_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `name`: String
- `email`: String
- `source`: str _(default)_
- `registered_at`: DateTime
- `email_verified`: Boolean _(default)_
- `email_verification_token`: String _(nullable)_
- `email_verified_at`: DateTime _(nullable)_
- `survey_completed_at`: DateTime _(nullable)_
- `survey_required`: Boolean _(default)_
- `can_download_cert`: Boolean _(default)_
- `public_member_id`: Integer _(fk, index, nullable)_
- `registration_answers`: JSONB _(nullable, default)_
- `unsubscribed_at`: DateTime _(nullable)_
- _relations_: event: , public_member: , attendaonce_records: , tickets: 

### EventTicket

pk: `id` (Integer) · fk: event_id, attendee_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `attendee_id`: Integer _(fk, index)_
- `token`: String _(unique, index)_
- `qr_payload`: Text
- `status`: String _(default, index)_
- `issued_at`: DateTime
- `checked_in_at`: DateTime _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: event: , attendee: 

### EventComment

pk: `id` (Integer) · fk: event_id, public_member_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `public_member_id`: Integer _(fk, index)_
- `body`: Text
- `status`: String _(default, index)_
- `report_count`: Integer _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: event: , public_member: 

### AttendaonceRecord

pk: `id` (Integer) · fk: attendee_id, session_id

- `id`: Integer _(pk)_
- `attendee_id`: Integer _(fk, index)_
- `session_id`: Integer _(fk, index)_
- `checked_in_at`: DateTime
- `ip_address`: String _(nullable)_
- _relations_: attendee: , session: 

### CheckinActivityLog

pk: `id` (Integer) · fk: event_id, session_id, attendee_id, ticket_id, actor_user_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `session_id`: Integer _(fk, nullable, index)_
- `attendee_id`: Integer _(fk, nullable, index)_
- `ticket_id`: Integer _(fk, nullable, index)_
- `actor_user_id`: Integer _(fk, nullable, index)_
- `method`: String _(default, index)_
- `source`: String _(default, index)_
- `entry_point`: String _(default, index)_
- `success`: Boolean _(default, index)_
- `duplicate`: Boolean _(default, index)_
- `invalid_reason`: String _(nullable, index)_
- `message`: String _(nullable)_
- `ip_address`: String _(nullable)_
- `created_at`: DateTime _(index)_

### AgentActionLog

pk: `id` (BigInteger) · fk: user_id

- `id`: BigInteger _(pk)_
- `user_id`: Integer _(fk, index)_
- `api_key_prefix`: String _(nullable)_
- `tool_name`: String
- `event_id`: Integer _(nullable, index)_
- `payload`: JSONB _(nullable)_
- `result_summary`: String _(nullable)_
- `ip_address`: String _(nullable)_
- `created_at`: DateTime

### CheckinKioskSession

pk: `id` (Integer) · fk: event_id, session_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `session_id`: Integer _(fk, nullable, index)_
- `token_hash`: String _(unique, index)_
- `label`: String _(default)_
- `created_by`: Integer _(fk, nullable, index)_
- `expires_at`: DateTime _(index)_
- `revoked_at`: DateTime _(nullable, index)_
- `last_seen_at`: DateTime _(nullable)_
- `created_at`: DateTime

### CheckinNonce

pk: `id` (Integer) · fk: event_id, actor_user_id, kiosk_session_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `nonce`: String _(unique, index)_
- `actor_user_id`: Integer _(fk, nullable, index)_
- `kiosk_session_id`: Integer _(fk, nullable, index)_
- `expires_at`: DateTime _(index)_
- `used_at`: DateTime _(nullable, index)_
- `created_at`: DateTime

### BadgeRule

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index, unique)_
- `badge_definitions`: JSONB _(default)_
- `enabled`: Boolean _(default)_
- `created_by`: Integer _(fk)_
- `updated_at`: DateTime
- _relations_: event: , creator: 

### ParticipantBadge

pk: `id` (Integer) · fk: event_id, attendee_id, awarded_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `attendee_id`: Integer _(fk, index)_
- `badge_type`: String
- `criteria_met`: JSONB _(nullable)_
- `awarded_by`: Integer _(fk, nullable)_
- `awarded_at`: DateTime
- `is_automatic`: Boolean _(default)_
- `badge_metadata`: JSONB _(nullable)_
- _relations_: event: , attendee: , awardedby: 

### EventRaffle

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `title`: String
- `prize_name`: String
- `description`: Text _(nullable)_
- `min_sessions_required`: Integer _(default)_
- `winner_count`: Integer _(default)_
- `reserve_winner_count`: Integer _(default)_
- `status`: String _(default)_
- `created_by`: Integer _(fk)_
- `created_at`: DateTime
- `updated_at`: DateTime
- `drawn_at`: DateTime _(nullable)_
- _relations_: event: , creator: , winners: 

### EventRaffleWinner

pk: `id` (Integer) · fk: raffle_id, attendee_id

- `id`: Integer _(pk)_
- `raffle_id`: Integer _(fk, index)_
- `attendee_id`: Integer _(fk, index)_
- `drawn_at`: DateTime
- _relations_: raffle: , attendee: 

### CertificateTierRule

pk: `id` (Integer) · fk: event_id, created_by

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index, unique)_
- `tier_definitions`: JSONB _(default)_
- `created_by`: Integer _(fk)_
- `updated_at`: DateTime
- _relations_: event: , creator: 

### EventSurvey

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index, unique)_
- `is_required`: Boolean _(default)_
- `survey_type`: String _(default)_
- `builtin_questions`: JSONB _(nullable)_
- `external_provider`: String _(nullable)_
- `external_url`: Text _(nullable)_
- `external_webhook_key`: String _(nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: event: 

### SurveyResponse

pk: `id` (Integer) · fk: event_id, attendee_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `attendee_id`: Integer _(fk, index)_
- `survey_type`: String
- `answers`: JSONB _(nullable)_
- `external_response_id`: String _(nullable)_
- `completed_at`: DateTime
- `completion_proof`: JSONB _(nullable)_
- _relations_: event: , attendee: 

### SponsorSlot

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, index)_
- `slot_position`: String
- `sponsor_name`: String
- `sponsor_logo_url`: Text
- `sponsor_website_url`: Text
- `sponsor_color_hex`: String _(default)_
- `enabled`: Boolean _(default)_
- `order_index`: Integer _(default)_
- `created_at`: DateTime
- _relations_: event: 

### OAuthClient

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `client_id`: String _(unique)_
- `client_secret_hash`: String
- `name`: String
- `redirect_uris`: JSONB _(default)_
- `allowed_scopes`: JSONB _(default)_
- `logo_url`: String _(nullable)_
- `is_active`: Boolean _(default)_
- `created_at`: DateTime _(default)_

### OAuthCode

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `code_hash`: String _(unique)_
- `client_id`: String
- `user_id`: Integer
- `redirect_uri`: Text
- `scopes`: JSONB _(default)_
- `code_challenge`: String _(nullable)_
- `code_challenge_method`: String _(nullable)_
- `expires_at`: DateTime
- `used`: Boolean _(default)_
- `created_at`: DateTime _(default)_

### OAuthRefreshToken

pk: `id` (Integer)

- `id`: Integer _(pk)_
- `token_hash`: String _(unique)_
- `client_id`: String
- `user_id`: Integer
- `scopes`: JSONB _(default)_
- `expires_at`: DateTime
- `revoked`: Boolean _(default)_
- `created_at`: DateTime _(default)_

### OrganizationMember

pk: `id` (Integer) · fk: organization_id, user_id, invited_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `user_id`: Integer _(fk, nullable, index)_
- `email`: String
- `role`: String _(default)_
- `permissions`: JSONB _(nullable)_
- `status`: String _(default)_
- `invited_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### OrgStaff

pk: `id` (Integer) · fk: org_id, user_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `user_id`: Integer _(fk, nullable, index)_
- `email`: String
- `display_name`: String _(nullable)_
- `role`: String
- `department`: String _(nullable)_
- `is_active`: Boolean
- `invited_at`: DateTime
- `joined_at`: DateTime _(nullable)_

### Quiz

pk: `id` (Integer) · fk: event_id

- `id`: Integer _(pk)_
- `event_id`: Integer _(fk, unique, index)_
- `title`: String _(default)_
- `description`: Text _(nullable)_
- `passing_score`: Integer _(default)_
- `max_attempts`: Integer _(default)_
- `time_limit_minutes`: Integer _(nullable)_
- `required_for_cert`: Boolean _(default)_
- `is_active`: Boolean _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime
- _relations_: questions: , attempts: 

### QuizQuestion

pk: `id` (Integer) · fk: quiz_id

- `id`: Integer _(pk)_
- `quiz_id`: Integer _(fk, index)_
- `question_text`: Text
- `question_type`: String _(default)_
- `order`: Integer _(default)_
- `points`: Integer _(default)_
- _relations_: quiz: , choices: , answers: 

### QuizChoice

pk: `id` (Integer) · fk: question_id

- `id`: Integer _(pk)_
- `question_id`: Integer _(fk, index)_
- `choice_text`: Text
- `is_correct`: Boolean _(default)_
- `order`: Integer _(default)_
- _relations_: question: 

### QuizAttempt

pk: `id` (Integer) · fk: quiz_id, member_id

- `id`: Integer _(pk)_
- `quiz_id`: Integer _(fk, index)_
- `member_id`: Integer _(fk, nullable, index)_
- `attendee_name`: String
- `attendee_email`: String _(nullable, index)_
- `score`: Integer _(default)_
- `passed`: Boolean _(default)_
- `attempt_number`: Integer _(default)_
- `cert_issued`: Boolean _(default)_
- `started_at`: DateTime
- `completed_at`: DateTime _(nullable)_
- _relations_: quiz: , answers: 

### QuizAnswer

pk: `id` (Integer) · fk: attempt_id, question_id, selected_choice_id

- `id`: Integer _(pk)_
- `attempt_id`: Integer _(fk, index)_
- `question_id`: Integer _(fk, index)_
- `selected_choice_id`: Integer _(fk, nullable)_
- `open_text_answer`: Text _(nullable)_
- _relations_: attempt: , question: 

### ScheduledReport

pk: `id` (Integer) · fk: organization_id, created_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `report_type`: String
- `filters_json`: JSONB _(default)_
- `frequency`: String _(default)_
- `recipients_json`: JSONB _(default)_
- `active`: Integer _(default)_
- `last_run_at`: DateTime _(nullable)_
- `next_run_at`: DateTime _(nullable)_
- `created_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

### OrgSsoConfig

pk: `id` (Integer) · fk: org_id

- `id`: Integer _(pk)_
- `org_id`: Integer _(fk, index)_
- `provider`: String
- `client_id`: String _(nullable)_
- `client_secret`: String _(nullable)_
- `tenant_id`: String _(nullable)_
- `redirect_uri`: Text _(nullable)_
- `extra_config_json`: Text _(nullable)_
- `is_active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

### OrganizationVenue

pk: `id` (Integer) · fk: organization_id

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `name`: String
- `capacity`: Integer
- `location`: String _(nullable)_
- `notes`: Text _(nullable)_
- `is_active`: Boolean _(default)_
- `created_at`: DateTime
- `updated_at`: DateTime

### VenueReservation

pk: `id` (Integer) · fk: organization_id, venue_id, created_by, updated_by

- `id`: Integer _(pk)_
- `organization_id`: Integer _(fk, index)_
- `venue_id`: Integer _(fk, index)_
- `title`: String
- `description`: Text _(nullable)_
- `start_at`: DateTime _(index)_
- `end_at`: DateTime _(index)_
- `status`: String _(default, index)_
- `calendar_provider`: String _(default)_
- `external_event_id`: String _(nullable)_
- `created_by`: Integer _(fk)_
- `updated_by`: Integer _(fk, nullable)_
- `created_at`: DateTime
- `updated_at`: DateTime

## Schema Source Files

Read and edit these files when adding columns, creating migrations, or changing relations:

- `/db_types.py` — imported by **7** files
- `/db.py` — imported by **4** files

---
_Back to [overview.md](./overview.md)_