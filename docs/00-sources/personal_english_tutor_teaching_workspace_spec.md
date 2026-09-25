# Personal English Tutor Teaching Workspace
## Project Requirements & Product Specification

> **Project status:** Requirements baseline / Source of Truth  
> **Purpose:** Tài liệu này được đưa cho AI coding/planning agent để nghiên cứu, phân tích, lập kế hoạch và đề xuất kiến trúc trước khi bắt đầu xây dựng hệ thống.  
> **Critical rule:** Agent phải đọc toàn bộ tài liệu này và coi đây là yêu cầu sản phẩm gốc. Không được tự ý biến hệ thống thành LMS của trung tâm, SaaS marketplace, hệ thống nhiều giáo viên, hay thêm các module kinh doanh không được yêu cầu.

---

# 1. Project Overview

Đây là một **nền tảng quản lý việc dạy tiếng Anh 1:1 dành cho một gia sư duy nhất**.

Gia sư tự chiêu sinh học viên bên ngoài hệ thống, chủ yếu thông qua:

- Facebook
- Zalo
- Điện thoại
- Email
- Các hội nhóm
- Các kênh liên hệ cá nhân khác

Sau khi hai bên đã trao đổi, thống nhất chương trình học, học phí và lịch học, gia sư sẽ **tự tạo tài khoản cho học viên trong hệ thống**.

Hệ thống không nhằm thay thế Facebook, Zalo, Zoom, Google Meet hay các công cụ thanh toán.

Hệ thống tồn tại để giải quyết phần:

> **quản lý học viên + nội dung giảng dạy + lộ trình cá nhân hóa + buổi học + bài tập + kiểm tra + tài liệu + kết quả + tiến độ + ghi chú**

Mô hình sản phẩm gần với:

> **Personal Teaching Management Workspace + Flexible LMS**

hơn là một LMS trường học/trung tâm.

---

# 2. Product Philosophy

Sản phẩm phải được thiết kế xoay quanh một nguyên tắc:

> **Cung cấp công cụ để gia sư tự xây dựng và điều khiển việc giảng dạy; không áp đặt sẵn cách gia sư phải giảng dạy.**

Hệ thống phải hỗ trợ gia sư:

- tự tạo nội dung
- tự sửa nội dung
- tự xóa nội dung
- tự sắp xếp nội dung
- tự tạo bài học
- tự tạo bài tập
- tự tạo kiểm tra
- tự tạo thi thử
- tự tạo mục tiêu
- tự tạo lộ trình
- tự đánh giá học viên
- tự quyết định nội dung giao cho từng học viên
- tái sử dụng nội dung khi cần
- cá nhân hóa toàn bộ trải nghiệm cho từng học viên

**Không được hard-code curriculum tiếng Anh.**

Ví dụ:

- TOEIC
- IELTS
- giao tiếp
- THPT
- ngữ pháp
- từ vựng
- phát âm

chỉ là các cách gia sư có thể tổ chức nội dung, không phải các loại hệ thống cố định phải tồn tại trong code.

---

# 3. Target User Model

Hệ thống chỉ có 2 loại người dùng chính.

## 3.1. Tutor

Một tài khoản gia sư duy nhất.

Tutor là:

- Owner
- Administrator
- Teacher
- Content Manager
- Student Manager

Toàn bộ quyền quản lý thuộc về tutor.

### Không cần hệ thống vai trò phức tạp:

Không xây:

- Owner
- Admin
- Manager
- Teacher
- Assistant Teacher
- Staff
- Branch Manager
- Academic Manager

Chỉ cần:

```text
TUTOR
STUDENT
```

---

## 3.2. Student

Học viên đăng nhập bằng tài khoản do tutor tạo.

Student không tự đăng ký tài khoản.

Student không có quyền quản lý hệ thống.

---

# 4. Authentication & Account Creation

## 4.1. Không có public registration

Không xây:

```text
Sign Up
Register
Create Account
```

cho người ngoài.

## 4.2. Tutor tự tạo học viên

Workflow:

```text
Tutor
  ↓
Student Management
  ↓
+ Add Student
  ↓
Nhập thông tin
  ↓
Tạo account
  ↓
Gửi username/password cho student
```

Thông tin tối thiểu có thể gồm:

- Họ tên
- Username
- Temporary password
- Email (optional)
- Số điện thoại (optional)
- Zalo/Facebook/contact (optional)
- Thông tin phụ huynh nếu cần
- Ghi chú

## 4.3. Student chỉ cần Login

Student có:

```text
Login
Logout
Change Password
Forgot Password (có thể triển khai sau)
```

Không có public account creation.

---

# 5. Những thứ chủ động loại khỏi hệ thống

Đây là phần **NON-GOALS** và phải được AI agent tôn trọng.

## 5.1. Tuyển sinh

Không xây:

- Public enrollment
- Trial lesson registration
- Online admission
- Lead management
- Marketing funnel
- Public student application
- Student self-enrollment

Quy trình tuyển sinh xảy ra ngoài hệ thống.

---

## 5.2. Payment

Không xây ở phiên bản hiện tại:

- Payment gateway
- Online payment
- Invoice
- Subscription
- Recurring billing
- Tuition collection
- Payment status
- Financial accounting

Gia sư tự trao đổi học phí với học viên bằng Facebook/Zalo/etc. và xử lý thanh toán bên ngoài.

---

## 5.3. Marketplace / SaaS

Không xây:

- Nhiều gia sư
- Marketplace
- Tutor discovery
- Public tutor listing
- Multi-center
- Branch
- Organization
- Multiple teaching staff

---

## 5.4. AI

Không tích hợp AI ở phiên bản hiện tại.

Không xây:

- AI question generation
- AI writing feedback
- AI speaking feedback
- AI learning recommendation
- AI chatbot
- AI lesson planner
- AI student analysis

Lý do:

- tăng chi phí vận hành
- tăng độ phức tạp
- chưa cần thiết
- không phải core value của sản phẩm

AI có thể được xem xét ở phase tương lai, nhưng **không được đưa vào MVP/Core Architecture nếu chưa có yêu cầu mới**.

---

## 5.5. Communication tools

Không xây:

- In-app chat
- Messenger clone
- Zalo clone
- Voice chat
- Video call
- Whiteboard online
- Video conferencing infrastructure

Tutor có thể lưu:

```text
Meeting URL
```

Ví dụ Google Meet hoặc Zoom.

---

## 5.6. Parent Portal

Không xây Parent Portal trong MVP.

Có thể lưu thông tin phụ huynh trong Student Profile nếu cần:

- Parent name
- Contact
- Relationship
- Notes

Nhưng phụ huynh không cần tài khoản riêng ở phiên bản đầu.

---

# 6. Core Product Model

Sản phẩm không nên xoay quanh:

```text
Course → Module → Lesson
```

như LMS truyền thống.

Trung tâm phải là:

```text
Tutor
  ↓
Students
  ↓
Student Workspace
  ├── Learning Profile
  ├── Goals
  ├── Learning Plan
  ├── Lessons
  ├── Assignments
  ├── Assessments
  ├── Materials
  ├── Vocabulary
  ├── Progress
  └── Teacher Notes
```

Mỗi học viên có thể có workflow riêng.

---

# 7. Student Workspace

Đây là khái niệm quan trọng nhất của hệ thống.

Ví dụ:

```text
Student A
├── Profile
├── Goals
├── Learning Plan
├── Lessons
├── Assignments
├── Assessments
├── Materials
├── Vocabulary
├── Progress
└── Teacher Notes
```

Student B có thể hoàn toàn khác:

```text
Student B
├── Profile
├── Goals
├── Learning Plan
├── Lessons
├── Assignments
├── Assessments
└── Progress
```

Không bắt mọi student phải có cùng cấu trúc nội dung hay cùng curriculum.

---

# 8. Student Learning Profile

Tutor cần quản lý hồ sơ học tập riêng của từng người.

Ví dụ:

```text
Student:
Nguyễn Văn A

Current Level:
B1

Goal:
TOEIC 650

Current Score:
570

Target Score:
650

Learning Style / Notes:
...

Weak Areas:
- Listening Part 3
- Perfect Tenses

Strong Areas:
- Reading
- Vocabulary

Teacher Notes:
...
```

Thông tin phải linh hoạt.

Không hard-code chỉ có:

```text
TOEIC Score
IELTS Score
```

Mà cho phép tutor lưu các mục tiêu/chỉ số phù hợp.

---

# 9. Goal System

Mỗi student có thể có nhiều mục tiêu.

Ví dụ:

```text
Goal:
TOEIC 650

Current:
570

Target:
650
```

hoặc:

```text
Goal:
Improve Speaking Fluency

Current:
5/10

Target:
8/10
```

hoặc:

```text
Goal:
Vocabulary

Current:
400 words

Target:
1000 words
```

Các metric nên có khả năng mở rộng.

Không nên giới hạn system vào một bộ metric tiếng Anh cố định.

---

# 10. Learning Plan

Thay vì ép student vào một Course cố định, student có:

```text
Learning Plan
```

Ví dụ:

```text
Student A
Goal: TOEIC 650

Phase 1
✓ Grammar Foundation

Phase 2
▶ Listening

Phase 3
○ Reading

Phase 4
○ Mock Tests
```

Một student khác có thể:

```text
Student B
Goal: TOEIC 800

Phase 1
✓ Reading

Phase 2
▶ Listening Part 3-4

Phase 3
○ Vocabulary
```

Tutor phải có thể:

- Create
- Edit
- Delete
- Reorder
- Move
- Pause
- Complete
- Add Goal
- Add Milestone
- Add Activity
- Change priority
- Adjust plan theo student

Learning Plan không phải curriculum bắt buộc.

---

# 11. Learning Plan Template

Có thể hỗ trợ template để giảm thời gian cho tutor.

Ví dụ:

```text
Template:
TOEIC Foundation 0 → 450
```

Template có thể gồm:

```text
Grammar
Vocabulary
Listening
Reading
Mock Test
```

Khi tạo student:

```text
Create Student
   ↓
Create Learning Plan
   ↓
Use Template (optional)
```

Sau đó tutor có thể chỉnh tùy ý.

Ví dụ:

```text
Student A
→ dùng 80% template

Student B
→ dùng 50% template

Student C
→ không dùng template
```

**Template chỉ là công cụ tăng tốc, không phải luật bắt buộc.**

---

# 12. Content Library

Content Library dùng để gia sư quản lý toàn bộ nội dung giảng dạy.

Ví dụ:

```text
Content Library
├── TOEIC
│   ├── Listening
│   ├── Reading
│   ├── Grammar
│   └── Vocabulary
├── IELTS
├── Giao tiếp
├── THPT
└── Miscellaneous
```

Nhưng các folder trên **chỉ là ví dụ**.

Tutor phải được phép tạo bất kỳ cấu trúc nào:

```text
+ New Folder
+ Rename
+ Move
+ Delete
```

---

# 13. Content Types

Hệ thống không cung cấp nội dung tiếng Anh có sẵn.

Hệ thống cung cấp công cụ để tutor tạo/quản lý:

## File / Material

- PDF
- DOCX
- PPTX
- Image
- Audio
- Video
- Other File

## Native content

- Rich Text
- Text-based lesson
- Link
- Embedded media

Mỗi content item có thể có:

- Title
- Description
- Tags
- Folder
- File
- Created date
- Updated date
- Author = Tutor
- Optional metadata

---

# 14. Lesson Builder

Tutor có thể tự tạo lesson.

Ví dụ:

```text
Lesson

Title:
Present Perfect

Duration:
90 minutes

Content:
- Grammar
- Vocabulary
- Exercise

Materials:
3 files

Homework:
Assignment #182
```

Một lesson khác:

```text
Lesson:
Speaking Practice #04

Duration:
60 minutes

Materials:
Audio #12

Homework:
Speaking submission
```

Không được bắt mọi lesson phải chứa cùng loại dữ liệu.

Lesson phải linh hoạt.

---

# 15. Reusable Content

Content phải tách khỏi Student Activity.

Nguyên tắc:

```text
Content Library
      ↓
Reusable Template / Content
      ↓
Assign to Student
      ↓
Student Activity
```

Ví dụ:

```text
Grammar - Present Perfect
```

là content gốc.

Tutor giao cho:

```text
Student A
Student B
Student C
```

Mỗi student phải có trạng thái riêng:

```text
Status
Score
Submission
Feedback
Deadline
Attempts
```

Thao tác của student không làm thay đổi content gốc.

---

# 16. Question Bank

Question Bank là kho câu hỏi do tutor tự xây dựng.

Tutor có thể:

- Create
- Edit
- Delete
- Duplicate
- Archive
- Search
- Filter
- Tag
- Organize

Một question có thể có:

```text
Question
Options
Correct Answer
Explanation
Difficulty
Tags
Score
Attachment
```

Ví dụ:

```text
Question:
The manager ______ the report yesterday.

A. reviews
B. reviewed
C. reviewing
D. review

Answer:
B

Tags:
Past Simple
TOEIC
Grammar
Part 5

Difficulty:
Easy
```

Các tag như:

- TOEIC
- IELTS
- Grammar
- Part 5

là dữ liệu tutor tạo.

Không nên hard-code các tag vào backend.

---

# 17. Assignment Engine

Assignment phải là một engine generic.

Tutor:

```text
+ Create Assignment
```

Có thể cấu hình:

```text
Title
Description
Instructions
Deadline
Attachments
Questions
Score
Pass mark
Time limit
```

Question types có thể hỗ trợ:

- Single Choice
- Multiple Choice
- True / False
- Fill in the Blank
- Short Answer
- Long Answer
- Matching
- Ordering
- Audio Response
- File Upload

Có thể mở rộng sau.

Mục tiêu là tutor tạo được nhiều loại bài khác nhau mà không cần developer xây từng loại “TOEIC exercise”, “IELTS exercise” riêng biệt.

---

# 18. Assessment / Quiz / Mock Test Engine

Không nên xây riêng:

```text
TOEIC Engine
IELTS Engine
THPT Engine
```

Thay vào đó:

```text
Assessment Engine
```

Tutor tự cấu hình assessment.

Ví dụ:

```text
Assessment:
TOEIC Mock Test #01

Time Limit:
120 minutes

Sections:
5

Questions:
100
```

Hoặc:

```text
Assessment:
IELTS Reading Practice

Sections:
3

Questions:
40
```

Hoặc:

```text
Assessment:
Đề kiểm tra giữa kỳ lớp 12
```

Hệ thống không cần hiểu “đây là TOEIC” hay “đây là IELTS”.

Assessment được định nghĩa bằng cấu hình, section, question, scoring, time limit, tags và metadata.

---

# 19. Submission & Grading

Student có thể nộp:

- Quiz result
- Text answer
- File
- Audio
- Other supported response

Hệ thống phải phân biệt:

```text
Automatic Grading
Manual Grading
```

Automatic grading phù hợp với question types có đáp án rõ ràng.

Manual grading phù hợp với:

- Writing
- Speaking
- Long answer
- File submission
- Open-ended response

Tutor có thể đưa feedback.

---

# 20. Teacher Feedback

Tutor phải có thể feedback cho từng submission/activity.

Ví dụ:

```text
Speaking Task #01

Pronunciation:
6/10

Fluency:
5/10

Vocabulary:
6/10

Grammar:
5/10
```

Có thể ghi comment:

```text
00:12
"environment"

→ pronunciation issue

00:37
"I have went..."

→ incorrect tense
```

Với writing/file có thể lưu nhận xét dạng text.

Mục tiêu là tạo một nơi thống nhất để student xem feedback của tutor.

Không bắt buộc phải xây advanced annotation UI ở MVP nếu độ phức tạp quá cao; cần phân tích chi phí/giá trị trước khi chọn implementation.

---

# 21. Vocabulary / Personal Learning Data

Vocabulary là một khu vực có thể được hỗ trợ nhưng phải giữ generic.

Tutor có thể tạo/manage:

```text
Word
Meaning
Example
Pronunciation
Notes
Tags
```

Có thể gán vocabulary cho student.

Ví dụ:

```text
Student A
Vocabulary Set:
Business English #01

20 words
```

Không hard-code một “TOEIC dictionary” có sẵn.

Về sau có thể mở rộng thành:

- Word status
- Learned / Reviewing / Weak
- Personal notes
- Vocabulary practice

nhưng MVP không cần phức tạp hóa nếu chưa có nhu cầu rõ.

---

# 22. Lesson & Schedule

Calendar nên tồn tại nhưng chỉ là công cụ quản lý lịch của tutor.

Không có student self-booking.

Tutor tạo:

```text
+ New Lesson Session
```

Chọn:

```text
Student
Date
Time
Duration
Online / Offline
Meeting Link
Notes
```

Ví dụ:

```text
25/09/2026
19:00 - 20:30

Student:
Nguyễn A

Subject:
TOEIC

Meeting:
Google Meet
```

Student chỉ xem lịch của chính mình.

---

# 23. Attendance

Mỗi lesson/session có thể lưu:

```text
Scheduled
Completed
Absent
Cancelled
Rescheduled
```

Có thể ghi:

```text
Attendance:
Present

Note:
Completed lesson 12
```

Không cần attendance engine của trường học.

---

# 24. Teacher Notes

Tutor cần vùng ghi chú riêng.

Có thể có:

```text
Private Teacher Notes
```

Ví dụ:

```text
- Student còn nhầm Present Perfect và Past Simple.
- Listening Part 3 yếu.
- Vocabulary business chưa tốt.
- Cần tăng Speaking practice.
```

Notes nên liên kết được với:

- Student
- Lesson
- Assignment
- Assessment

nhưng quyền xem phải rõ ràng để student không đọc được private notes.

---

# 25. Progress Tracking & Dashboard

Progress không nên chỉ là:

```text
Course completed: 75%
```

vì 1:1 có tính cá nhân hóa.

Nên hỗ trợ nhiều dạng dữ liệu:

```text
Assignments completed
Quiz scores
Mock test scores
Attendance
Goals
Milestones
Teacher assessments
Learning activities
```

Ví dụ:

```text
Student Progress

Assignments:
18 / 22

Average:
82%

Mock Tests:
550 → 585 → 610

Goals:
3 / 5 completed
```

Có thể hiển thị skill metrics:

```text
Listening
███████░░░

Reading
████████░░

Vocabulary
██████░░░░

Grammar
████████░░

Speaking
█████░░░░░
```

Nhưng các skill/metric cũng nên có khả năng cấu hình.

---

# 26. Student Dashboard

Student dashboard phải đơn giản.

Ví dụ:

```text
Good evening, Nguyễn A

Your Goal
━━━━━━━━━━━━━━
TOEIC 650

Current:
570

Target:
650

Progress:
████████████░░░░ 78%

Today's Tasks

☑ Vocabulary Unit 5
☐ TOEIC Part 5
☐ Listening Part 3

Upcoming

Tomorrow 19:00
TOEIC - Lesson 12

Recent Result

Mock Test #02
Score: 585
```

Student chỉ thấy:

- dữ liệu của chính mình
- lesson của mình
- assignment của mình
- assessment của mình
- material được cấp cho mình
- progress của mình
- feedback của tutor dành cho mình

Không thấy student khác.

---

# 27. Tutor Dashboard

Tutor dashboard là nơi giúp tutor làm việc mỗi ngày.

Nên ưu tiên:

```text
Today's Schedule

Students requiring attention

Pending submissions

Recent student activity

Upcoming lessons

Quick Actions
```

Ví dụ:

```text
Good evening, Teacher

24 Students
5 Lessons today
12 Pending submissions

Today's Schedule
18:00 Nguyễn A — TOEIC
19:30 Trần B — IELTS
21:00 Lê C — Communication

Need Attention
3 students haven't submitted homework
2 students falling behind
```

Không cần dashboard quá nhiều chart.

Dashboard phải ưu tiên action.

---

# 28. Daily Tutor Workflow

Workflow chính nên cực ngắn:

```text
Tutor Login
    ↓
Dashboard
    ↓
Select Student
    ↓
View Today's Lesson
    ↓
Teach
    ↓
Mark Session Completed
    ↓
Write Notes
    ↓
Attach / Reference Material
    ↓
Assign Homework
    ↓
Done
```

Mục tiêu UX:

> Tutor có thể hoàn thành công việc sau buổi học trong vài thao tác, không phải đi qua nhiều màn hình.

---

# 29. Student Daily Workflow

```text
Student Login
    ↓
Dashboard
    ↓
See Today's Tasks
    ↓
Open Lesson / Assignment
    ↓
Study
    ↓
Submit
    ↓
See Score / Feedback
    ↓
Continue Learning Plan
```

---

# 30. Student-specific Personalization

Đây là yêu cầu cốt lõi.

Ví dụ:

```text
Student A
Current level: A2
Goal: TOEIC 500
Weak: Grammar

Learning Plan:
Grammar-heavy
```

Student B:

```text
Student B
Current level: B1
Goal: TOEIC 750
Weak: Listening

Learning Plan:
Listening-heavy
```

Student C:

```text
Student C
IELTS 5.5 → 6.5
Weak: Writing

Learning Plan:
Writing-heavy
```

Không được ép ba người vào cùng một course progression.

---

# 31. Course Concept

Không nhất thiết phải loại bỏ Course hoàn toàn.

Nếu có Course, Course nên đóng vai trò:

> **Reusable Template / Content Structure**

chứ không phải một curriculum bắt buộc.

Ví dụ:

```text
TOEIC Foundation 0 → 450
```

có thể là template.

Sau đó tutor instantiate/customize nó cho từng student.

Một student không dùng course nào vẫn hợp lệ.

---

# 32. Content vs Student Activity

Đây là nguyên tắc dữ liệu quan trọng.

## Original Content

```text
Question #25
```

nằm trong Question Bank.

## Student Activity

```text
Assignment #182
Student:
Nguyễn A
```

sử dụng Question #25.

Khi Nguyễn A trả lời:

```text
Submission
Score
Feedback
Attempt
```

phải lưu ở activity/submission của Nguyễn A.

Không thay đổi Question Bank gốc.

Tương tự:

```text
Lesson Template
        ↓
Student Lesson Instance
```

nếu hệ thống cần versioning/instance hóa.

---

# 33. Flexibility Principle

Mọi module phải tuân theo:

> **Generic engine, user-defined content.**

Không nên:

```text
TOEICLesson
IELTSLesson
EnglishSpeakingLesson
THPTHomework
```

nếu chỉ khác nhau về dữ liệu.

Nên:

```text
Lesson
Assignment
Assessment
Question
Material
Goal
Metric
LearningPlan
```

và cho phép tutor định nghĩa metadata.

---

# 34. Data Model Direction

Một hướng entity/model ban đầu:

```text
User
StudentProfile

LearningGoal
LearningMetric

LearningPlan
LearningPlanTemplate
LearningPlanItem

ContentFolder
ContentItem
Material

Lesson
LessonSession
Attendance

Question
QuestionOption
QuestionBank

Assignment
AssignmentQuestion
AssignmentSubmission
Answer

Assessment
AssessmentSection
AssessmentQuestion
AssessmentAttempt

Feedback
TeacherNote

VocabularyItem
StudentVocabulary

ProgressRecord

Notification
```

Đây là danh sách định hướng, **không phải schema cuối cùng**.

AI agent phải phân tích lại:

- aggregate boundaries
- relationships
- normalization
- versioning
- soft delete
- audit fields
- multi-tenancy necessity
- security
- ownership

trước khi code.

---

# 35. Architecture Direction

Một lựa chọn phù hợp ban đầu:

> **Modular Monolith**

Không nên microservice ngay.

Ví dụ:

```text
src/
├── Web/
├── Modules/
│   ├── Identity/
│   ├── Students/
│   ├── Content/
│   ├── LearningPlans/
│   ├── Lessons/
│   ├── Assignments/
│   ├── Assessments/
│   ├── Progress/
│   └── Notifications/
├── Infrastructure/
└── Shared/
```

Lý do:

- Chỉ một tutor
- Scope nhỏ hơn LMS trung tâm
- Dễ triển khai
- Dễ debug
- Dễ thay đổi domain
- Không cần distributed system complexity

Microservice chỉ được xem xét ở tương lai nếu có bằng chứng thật sự cần.

---

# 36. Suggested Technical Direction

Nếu dự án được xây theo hướng .NET:

```text
Frontend:
React / Next.js

Backend:
ASP.NET Core Web API

ORM:
EF Core

Database:
SQL Server hoặc PostgreSQL

Cache (nếu thật sự cần):
Redis

File Storage:
S3-compatible / MinIO / cloud object storage

Authentication:
JWT hoặc cookie-based authentication tùy frontend architecture

Background Jobs:
Chỉ dùng khi thật sự cần

Realtime:
Không bắt buộc
```

Không được tự động thêm:

- Kafka
- RabbitMQ
- Elasticsearch
- Kubernetes
- microservices
- event-driven architecture

chỉ để làm project “ngầu”.

Mọi công nghệ phải có lý do nghiệp vụ hoặc kỹ thuật rõ ràng.

---

# 37. Security Requirements

Do tutor có quyền toàn hệ thống, security vẫn rất quan trọng.

Phải đảm bảo:

```text
Student A
≠
Student B
```

Student không thể:

- xem dữ liệu student khác
- xem teacher private notes
- sửa learning plan nếu không được phép
- xem content chưa được cấp quyền
- xem submission của student khác

Tutor có quyền quản lý toàn bộ dữ liệu.

Cần phân biệt:

```text
Private Teacher Data
```

và:

```text
Student-visible Data
```

---

# 38. File & Material Management

Hệ thống cần cân nhắc:

- Upload
- Download/View
- Delete
- Rename
- Organize
- Attach to lesson
- Attach to assignment
- Attach to assessment
- Attach to student
- File metadata

Nhưng cần tránh biến hệ thống thành Google Drive clone.

Chỉ quản lý file phục vụ việc dạy học.

---

# 39. Notification

Notification chỉ nên hỗ trợ các sự kiện hữu ích.

Ví dụ:

```text
Assignment mới
Upcoming lesson
Assignment deadline
Teacher feedback
Assessment result
```

Không cần xây messaging system.

Kênh có thể bắt đầu bằng:

```text
In-app notification
```

Email/push có thể xem xét sau.

---

# 40. UX Principles

## 40.1. Tutor-first

Hệ thống được thiết kế ưu tiên cho công việc của tutor.

## 40.2. Few clicks

Các thao tác thường xuyên phải nhanh.

## 40.3. No unnecessary setup

Tutor không phải khai báo 30 thứ trước khi tạo lesson.

## 40.4. Flexible

Tutor có thể tạo thứ chưa được developer nghĩ tới.

## 40.5. Progressive complexity

Chức năng đơn giản hiển thị trước.

Advanced configuration chỉ xuất hiện khi cần.

## 40.6. Avoid enterprise UI

Không bắt chước:

- School ERP
- Center management
- Enterprise LMS

---

# 41. Information Architecture

Một cấu trúc navigation khả thi:

```text
TUTOR
├── Dashboard
├── Students
├── Content
├── Question Bank
├── Learning Plans
├── Lessons / Calendar
├── Assignments
├── Assessments
├── Progress
└── Settings
```

Có thể điều chỉnh sau khi UX research.

Không nên tạo menu cho mọi entity database.

Menu phải phản ánh task của người dùng.

---

# 42. MVP Scope

MVP nên tập trung vào:

```text
Authentication
Student Management
Student Workspace

Content Library
Material Management

Question Bank

Lesson Management
Lesson Session
Attendance
Teacher Notes

Learning Plan
Goals

Assignment Builder
Submission
Grading
Feedback

Assessment / Quiz / Mock Test
Assessment Attempt
Results

Progress Tracking

Tutor Dashboard
Student Dashboard
```

---

# 43. Phase 2

Sau MVP có thể xem xét:

```text
Learning Plan Templates
Advanced calendar
Recurring lessons
More question types
Better file management
Notification system
Advanced progress analytics
Vocabulary tools
Versioning
More powerful reporting
```

---

# 44. Phase 3 / Future

Chỉ nghiên cứu sau khi core system ổn:

```text
AI assistant
AI-generated questions
AI writing analysis
AI speaking analysis
Public landing page
Integration with external tools
Payment integrations
Parent portal
More sophisticated analytics
```

Không được đưa vào MVP chỉ vì “có thể làm”.

---

# 45. What the system is NOT

Đây là một phần bắt buộc để tránh AI agent đi sai hướng.

Hệ thống **KHÔNG phải**:

```text
❌ Trung tâm tiếng Anh
❌ School LMS
❌ Marketplace gia sư
❌ Multi-tenant SaaS phức tạp
❌ Booking platform
❌ Payment platform
❌ Social network
❌ Video conferencing app
❌ Google Drive replacement
❌ AI tutor
❌ Pre-built TOEIC/IELTS content platform
```

Nó là:

```text
✅ Personal Teaching Workspace
✅ Tutor Management System
✅ Flexible LMS for 1:1 tutoring
✅ Student-centric learning workspace
✅ Generic content/assessment engine
✅ Personalized learning management
```

---

# 46. Core User Stories

## Tutor

### Student management

```text
As a tutor,
I want to create a student account,
so that the student can log in.
```

```text
As a tutor,
I want to edit a student's profile,
so that student information remains accurate.
```

### Learning

```text
As a tutor,
I want to create a learning plan,
so that I can personalize the student's path.
```

### Content

```text
As a tutor,
I want to create and organize learning content,
so that I can reuse it later.
```

### Assignment

```text
As a tutor,
I want to build assignments from my question bank,
so that I can create custom homework.
```

### Assessment

```text
As a tutor,
I want to create custom assessments,
so that I can run quizzes and mock tests.
```

### Feedback

```text
As a tutor,
I want to grade and comment on student submissions,
so that the student knows how to improve.
```

### Lesson

```text
As a tutor,
I want to record what happened in a lesson,
so that I have a learning history.
```

### Progress

```text
As a tutor,
I want to see student progress,
so that I can adjust the learning plan.
```

---

# 47. Student User Stories

```text
As a student,
I want to log in,
so that I can access my learning workspace.
```

```text
As a student,
I want to see my learning plan,
so that I understand what I should study.
```

```text
As a student,
I want to access my assigned materials,
so that I can study.
```

```text
As a student,
I want to complete assignments,
so that my tutor can review my work.
```

```text
As a student,
I want to see my scores and feedback,
so that I know how I am progressing.
```

```text
As a student,
I want to see upcoming lessons,
so that I know when my next class is.
```

---

# 48. Critical UX Scenario

The most important real-world scenario:

## After a lesson

Tutor should be able to:

```text
1. Open student
2. Open today's lesson
3. Mark completed
4. Write short note
5. Add material
6. Create/attach homework
7. Save
```

This flow should be optimized before adding secondary features.

---

# 49. Another Critical UX Scenario

## Creating a student

```text
1. Students
2. + Add Student
3. Fill basic information
4. Create account
5. Set goal
6. Optional: create learning plan
7. Optional: choose template
8. Save
```

Do not force tutor to configure everything.

Student can be created first and configured progressively.

---

# 50. Another Critical UX Scenario

## Create new assessment

```text
1. Assessments
2. + Create
3. Name
4. Add sections
5. Pick/create questions
6. Configure scoring
7. Configure time
8. Save
9. Assign to student
```

The assessment engine should be generic enough for:

- TOEIC
- IELTS
- school exam
- grammar quiz
- custom test

without special-case code.

---

# 51. Product Success Criteria

Do not judge project quality by the number of features.

The product is successful when:

### Tutor can:

- create/manage students
- see each student's profile
- build personalized learning plans
- create and organize content
- reuse content
- create assignments
- create assessments
- grade submissions
- give feedback
- schedule lessons
- record lesson history
- see progress

### Student can:

- log in
- view their learning plan
- view lessons
- view assigned materials
- complete assignments
- submit work
- view results
- view feedback
- track progress

### And critically:

> **Tutor is never forced to use a curriculum or workflow that does not fit the individual student.**

---

# 52. Design Principles for the AI Agent

Before implementing anything, AI agent must:

1. Read this entire document.
2. Extract functional requirements.
3. Separate MVP from future scope.
4. Identify entities and relationships.
5. Identify user workflows.
6. Identify permissions/security boundaries.
7. Identify reusable content vs student-specific activity.
8. Propose modular architecture.
9. Check whether every proposed technology is justified.
10. Identify ambiguities and assumptions.
11. Produce implementation order.
12. Produce database design.
13. Produce API design.
14. Produce frontend information architecture.
15. Produce validation rules.
16. Produce test strategy.
17. Produce deployment strategy.
18. Estimate major technical risks.
19. Check the proposal against every requirement in this document.
20. Only then proceed to implementation.

---

# 53. Agent Must Not Make These Assumptions

Agent must NOT assume that:

```text
Every student belongs to a Course
```

Agent must NOT assume:

```text
Every lesson has video
```

Agent must NOT assume:

```text
Every assignment is multiple choice
```

Agent must NOT assume:

```text
Every assessment is TOEIC/IELTS
```

Agent must NOT assume:

```text
Every student follows the same roadmap
```

Agent must NOT assume:

```text
Tutor wants AI
```

Agent must NOT assume:

```text
Tutor wants online payment
```

Agent must NOT assume:

```text
Tutor wants public enrollment
```

Agent must NOT assume:

```text
Tutor wants multiple staff accounts
```

Agent must NOT assume:

```text
The system must provide English content.
```

---

# 54. Non-functional Priorities

Priority order:

```text
1. Simplicity
2. Flexibility
3. Correctness
4. Security
5. Maintainability
6. Good UX
7. Performance
8. Scalability
```

Scalability should be reasonable, but the system must not be over-engineered for enterprise scale.

---

# 55. Expected Product Character

The final product should feel like:

> “A private teacher's digital workspace.”

Not:

> “A giant LMS.”

A tutor should be able to open the system and immediately answer:

```text
Who am I teaching today?
What does this student need?
What did we do last time?
What should I teach next?
What homework is pending?
What result did the student get?
Where is the material?
How is this student progressing?
```

---

# 56. Final Product Model

The final conceptual model is:

```text
                         TUTOR
                           │
                           ▼
                      WORKSPACE
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
        ▼                  ▼                   ▼
     STUDENTS           CONTENT            SCHEDULE
        │                  │                   │
        │                  ├── Materials       ├── Lessons
        │                  ├── Lessons         ├── Sessions
        │                  ├── Questions       └── Attendance
        │                  └── Assessments
        │
        ├── Profile
        ├── Goals
        ├── Learning Plan
        ├── Assignments
        ├── Submissions
        ├── Feedback
        ├── Progress
        └── Notes
```

Student side:

```text
                     STUDENT LOGIN
                           │
                           ▼
                    STUDENT WORKSPACE
                           │
       ┌───────────────────┼──────────────────┐
       │                   │                  │
       ▼                   ▼                  ▼
  Learning Plan       Assignments        Lessons
       │                   │                  │
       ▼                   ▼                  ▼
   Materials          Submission          Schedule
                           │
                           ▼
                     Results / Feedback
                           │
                           ▼
                        Progress
```

---

# 57. One-sentence Product Definition

> **Một workspace quản lý giảng dạy tiếng Anh 1:1 cho một gia sư duy nhất, nơi gia sư toàn quyền tự tạo, tổ chức, cá nhân hóa và quản lý nội dung, bài học, bài tập, kiểm tra, lộ trình và tiến độ của từng học viên mà không bị ràng buộc bởi curriculum hay workflow cố định.**

---

# 58. Final Scope Guardrail

Nếu trong quá trình planning hoặc implementation AI agent phát hiện một tính năng nghe có vẻ hữu ích nhưng làm hệ thống tiến gần hơn đến:

- LMS trung tâm
- marketplace
- booking platform
- payment platform
- social platform
- AI platform
- video conferencing platform
- enterprise school management

thì phải **dừng lại và đánh giá lại với Product Philosophy ở đầu tài liệu**, thay vì tự ý đưa vào.

Nguyên tắc:

> **Better to have a small system that the tutor actually wants to use every day than a giant system that creates more work than it removes.**

---

# 59. Research Context

Các quan sát ban đầu về sản phẩm tutoring/LMS hiện nay cho thấy nhiều giải pháp cho tutor/private tutoring tập trung vào các khu vực như student records, lesson management, homework, learning plans, scheduling và progress; các hệ thống lớn hơn thường mở rộng sang billing, multiple staff, parent/organization workflows. Một số thảo luận cộng đồng của private tutors cũng phản ánh việc workflow thường bị chia nhỏ giữa nhiều công cụ như calendar, video meeting, documents/spreadsheets và messaging.

Các nguồn đã được tham khảo trong giai đoạn hình thành ý tưởng gồm:

- Tutlio — tutor management / tutoring workflow
- Availy — private tutor management
- Tutitor — tutoring workflow
- TutorLab — software workflow cho private tutors
- BeFluent — teacher/student portal
- Instructure Canvas — LMS reference
- Selfomy — learning/assessment tooling
- Một số thảo luận cộng đồng private tutors

Các nguồn này chỉ dùng làm **context tham khảo thị trường**, không phải template bắt buộc phải sao chép.

---

# 60. Instruction to the Planning Agent

## DO NOT START CODING IMMEDIATELY.

Trước khi viết code, hãy tạo một kế hoạch xây dựng đầy đủ gồm:

### A. Product Analysis

- Xác nhận lại product model.
- Chỉ ra core modules.
- Chỉ ra non-goals.
- Chỉ ra assumptions.
- Xác định các điểm còn mơ hồ.

### B. Domain Design

- Entity model.
- Relationships.
- Aggregates.
- Lifecycle/state.
- Ownership.
- Reusable content vs student-specific activity.

### C. Database

- Tables/entities.
- PK/FK.
- Indexes.
- Constraints.
- Soft delete strategy.
- Audit fields.
- File metadata.
- Security-sensitive fields.

### D. Backend

- Module boundaries.
- API endpoints.
- Authentication.
- Authorization.
- Validation.
- Error handling.
- File storage.
- Assignment/assessment engine.
- Progress calculation.

### E. Frontend

- Routes.
- Tutor navigation.
- Student navigation.
- Dashboards.
- Student workspace.
- Forms.
- Tables.
- Detail pages.
- Assignment/test flows.
- Responsive behavior.

### F. UX

Đặc biệt kiểm tra:

- Add Student flow
- Student workspace
- Create lesson
- After-lesson workflow
- Create assignment
- Create assessment
- Grade submission
- Learning plan editing
- Progress view

### G. Testing

- Unit tests
- Integration tests
- API tests
- Authorization tests
- Student isolation tests
- Assignment grading tests
- Assessment tests
- File access tests

### H. Delivery Plan

Chia thành các milestone có thứ tự hợp lý.

Không triển khai tất cả mọi thứ cùng lúc.

### I. Scope Verification

Sau khi lập kế hoạch phải đối chiếu lại với tài liệu này và trả lời:

```text
Requirement
→ Planned implementation
→ Relevant module
→ MVP / Future
```

Nếu một đề xuất không được hỗ trợ bởi requirements hiện tại, phải đánh dấu là:

```text
OPTIONAL / FUTURE / REQUIRES PRODUCT DECISION
```

Không tự đưa vào core.

---

# 61. Product North Star

Mọi quyết định kỹ thuật và UX cuối cùng phải phục vụ một câu hỏi:

> **“Hệ thống này có giúp một gia sư duy nhất quản lý việc dạy 1:1 dễ hơn so với việc dùng Zalo + Google Drive + Word/PDF + Zoom/Meet + Sheets hay không?”**

Nếu một tính năng làm hệ thống phức tạp hơn nhưng không tạo ra giá trị rõ ràng cho công việc hàng ngày của tutor, ưu tiên **không xây hoặc trì hoãn**.

---

# END OF PRODUCT SPECIFICATION
