import type { LabStep } from '../types/schema';

// Helper to create column
const col = (
  id: string,
  name: string,
  type: any,
  isPK = false,
  isFK = false,
  isNullable = false,
  isUnique = false,
  isIndexed = false,
  defaultValue?: string,
  comment?: string,
  references?: { tableId: string; columnId: string }
) => ({
  id,
  name,
  type,
  isPrimaryKey: isPK,
  isForeignKey: isFK,
  isNullable,
  isUnique,
  isIndexed: isIndexed || isPK || isFK,
  defaultValue,
  comment,
  references,
});

export const LMS_LAB_STEPS: LabStep[] = [
  {
    stepNumber: 1,
    title: 'Core Authentication & Users',
    category: 'Identity & Access',
    estimatedMinutes: 5,
    overview:
      'Begin by modeling the central `users` entity to handle authentication, multi-role privileges (student, instructor, admin), and security tokens.',
    architectureContext:
      'In high-scale systems, using UUID v7 or v4 avoids auto-increment ID enumeration attacks and facilitates distributed writes across shards. We separate authentication from rich user profiles to keep auth lookups ultra-fast.',
    scaleConsiderations: [
      'Email must have a UNIQUE index for O(1) login lookups.',
      'Store password hashes using argon2/bcrypt strings, never plain text.',
      'Keep auth table lean to maximize database buffer cache hit ratio.',
    ],
    tasks: [
      {
        id: 't1',
        text: 'Create a `users` table with a UUID primary key',
        detail: 'Name the table `users` and define `id` as UUID (PK).',
      },
      {
        id: 't2',
        text: 'Add unique email and password hash columns',
        detail: 'Define `email` (VARCHAR, Unique, Not Null) and `password_hash` (VARCHAR).',
      },
      {
        id: 't3',
        text: 'Add `role` and timestamp columns',
        detail: 'Define `role` (ENUM or VARCHAR) and `created_at` (TIMESTAMP).',
      },
    ],
    validationRules: [
      {
        id: 'v1_users_exists',
        description: 'Table `users` exists with primary key',
        validate: (tables) => {
          const users = tables.find((t) => t.name.toLowerCase() === 'users');
          if (!users) return { passed: false, message: 'Missing table `users`' };
          const pk = users.columns.find((c) => c.isPrimaryKey);
          if (!pk) return { passed: false, message: 'Table `users` needs a Primary Key column' };
          return { passed: true, message: 'Table `users` configured with PK' };
        },
      },
      {
        id: 'v1_users_email',
        description: '`email` column exists and is Unique',
        validate: (tables) => {
          const users = tables.find((t) => t.name.toLowerCase() === 'users');
          if (!users) return { passed: false, message: 'Missing `users` table' };
          const email = users.columns.find((c) => c.name.toLowerCase() === 'email');
          if (!email) return { passed: false, message: 'Missing `email` column in `users`' };
          if (!email.isUnique) return { passed: false, message: 'Column `email` should be UNIQUE' };
          return { passed: true, message: 'Column `email` has unique constraint' };
        },
      },
    ],
    hints: [
      'Click "+ Add Table" and name it "users".',
      'Toggle the "PK" pill for the id column.',
      'Check the "UQ" (Unique) checkbox for email.',
    ],
    starterTables: [],
    solutionTables: [
      {
        id: 'tbl_users',
        name: 'users',
        color: 'blue',
        position: { x: 100, y: 120 },
        columns: [
          col('u_1', 'id', 'UUID', true),
          col('u_2', 'email', 'VARCHAR', false, false, false, true, true),
          col('u_3', 'password_hash', 'VARCHAR', false, false, false, false),
          col('u_4', 'role', 'ENUM', false, false, false, false, true, "'student'"),
          col('u_5', 'is_active', 'BOOLEAN', false, false, false, false, false, 'true'),
          col('u_6', 'created_at', 'TIMESTAMP', false, false, false, false, false, 'CURRENT_TIMESTAMP'),
        ],
      },
    ],
    solutionRelations: [],
  },

  {
    stepNumber: 2,
    title: 'Profiles & Separation of Concerns',
    category: 'Identity & Access',
    estimatedMinutes: 6,
    overview:
      'Separate heavy profile attributes (bio, social links, avatars) from the high-throughput `users` authentication table into a 1:1 `profiles` table.',
    architectureContext:
      'Reading a 500-character instructor bio on every token verification wastes cache memory. By isolating profile data, auth queries remain compact in-memory.',
    scaleConsiderations: [
      '`user_id` in `profiles` should be UNIQUE to enforce strict 1:1 cardinality.',
      'Cascade delete on `user_id` ensures orphaned profiles are purged when users delete accounts.',
    ],
    tasks: [
      {
        id: 't2_1',
        text: 'Create a `profiles` table',
        detail: 'Include `id`, `user_id`, `first_name`, `last_name`, `bio`, and `avatar_url`.',
      },
      {
        id: 't2_2',
        text: 'Establish 1:1 relation from `profiles.user_id` to `users.id`',
        detail: 'Set foreign key `user_id` pointing to `users.id` with a UNIQUE constraint.',
      },
    ],
    validationRules: [
      {
        id: 'v2_profile_exists',
        description: 'Table `profiles` exists with `user_id` foreign key',
        validate: (tables, _relations) => {
          const profiles = tables.find((t) => t.name.toLowerCase() === 'profiles');
          if (!profiles) return { passed: false, message: 'Missing table `profiles`' };
          const fk = profiles.columns.find(
            (c) => c.name.toLowerCase() === 'user_id' && (c.isForeignKey || c.references)
          );
          if (!fk) return { passed: false, message: '`profiles` requires a `user_id` foreign key column' };
          return { passed: true, message: '`profiles` table configured' };
        },
      },
    ],
    hints: [
      'Add table `profiles` with `user_id` column.',
      'In the column editor, mark `user_id` as FK referencing `users(id)`.',
    ],
    starterTables: [],
    solutionTables: [
      {
        id: 'tbl_users',
        name: 'users',
        color: 'blue',
        position: { x: 80, y: 120 },
        columns: [
          col('u_1', 'id', 'UUID', true),
          col('u_2', 'email', 'VARCHAR', false, false, false, true, true),
          col('u_3', 'password_hash', 'VARCHAR'),
          col('u_4', 'role', 'ENUM', false, false, false, false, true, "'student'"),
          col('u_5', 'created_at', 'TIMESTAMP', false, false, false, false, false, 'CURRENT_TIMESTAMP'),
        ],
      },
      {
        id: 'tbl_profiles',
        name: 'profiles',
        color: 'slate',
        position: { x: 440, y: 120 },
        columns: [
          col('p_1', 'id', 'UUID', true),
          col('p_2', 'user_id', 'UUID', false, true, false, true, true, undefined, undefined, {
            tableId: 'tbl_users',
            columnId: 'u_1',
          }),
          col('p_3', 'first_name', 'VARCHAR'),
          col('p_4', 'last_name', 'VARCHAR'),
          col('p_5', 'headline', 'VARCHAR', false, false, true),
          col('p_6', 'biography', 'TEXT', false, false, true),
          col('p_7', 'avatar_url', 'VARCHAR', false, false, true),
        ],
      },
    ],
    solutionRelations: [
      {
        id: 'rel_users_profiles',
        sourceTableId: 'tbl_profiles',
        sourceColumnId: 'p_2',
        targetTableId: 'tbl_users',
        targetColumnId: 'u_1',
        type: '1:1',
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    stepNumber: 3,
    title: 'Hierarchical Course Categories',
    category: 'Content Catalog',
    estimatedMinutes: 5,
    overview:
      'Implement taxonomy tables to classify courses into searchable categories (e.g., Development) and subcategories (e.g., Web Development, Databases).',
    architectureContext:
      'Categorization allows fast faceted search filters and SEO-friendly slug routes. Storing a `slug` with unique index enables clean URLs like `/courses/development/databases`.',
    scaleConsiderations: [
      'Slugs should be indexed for sub-millisecond route resolution.',
      'Categories have high read traffic, making them prime candidates for read-replicas or Redis caching.',
    ],
    tasks: [
      {
        id: 't3_1',
        text: 'Create `categories` and `subcategories` tables',
        detail: 'Include `id`, `name`, `slug` in categories, and reference `category_id` in subcategories.',
      },
      {
        id: 't3_2',
        text: 'Add Foreign Key relation',
        detail: 'Link `subcategories.category_id` to `categories.id`.',
      },
    ],
    validationRules: [
      {
        id: 'v3_cat_exists',
        description: 'Both `categories` and `subcategories` exist with FK link',
        validate: (tables) => {
          const cat = tables.find((t) => t.name.toLowerCase() === 'categories');
          const sub = tables.find((t) => t.name.toLowerCase() === 'subcategories');
          if (!cat) return { passed: false, message: 'Missing `categories` table' };
          if (!sub) return { passed: false, message: 'Missing `subcategories` table' };
          const fk = sub.columns.find((c) => c.name.toLowerCase() === 'category_id');
          if (!fk) return { passed: false, message: '`subcategories` needs a `category_id` foreign key' };
          return { passed: true, message: 'Category hierarchy modeled properly' };
        },
      },
    ],
    hints: [
      'Add `categories` with columns `id`, `name`, `slug`.',
      'Add `subcategories` with `id`, `category_id` (FK), `name`, `slug`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 4,
    title: 'Courses & Publishing Lifecycle',
    category: 'Content Catalog',
    estimatedMinutes: 8,
    overview:
      'Model the primary `courses` entity where instructors draft, submit, price, and publish interactive video courses.',
    architectureContext:
      'A course requires tracking instructor ownership (`instructor_id`), subcategory taxonomy, pricing, skill level, and publication states (`draft`, `in_review`, `published`, `archived`).',
    scaleConsiderations: [
      'Index `(status, created_at)` to support high-throughput course discovery feeds.',
      'Use DECIMAL(10,2) for `price` to avoid floating point calculation rounding errors.',
      'Soft-delete flags or status enums allow preserving historical purchase receipts even if a course is delisted.',
    ],
    tasks: [
      {
        id: 't4_1',
        text: 'Create `courses` table',
        detail: 'Define columns: `id`, `instructor_id` (FK to users), `subcategory_id` (FK), `title`, `slug`, `price`, `status`, `level`.',
      },
      {
        id: 't4_2',
        text: 'Connect `instructor_id` to `users.id`',
        detail: 'Enforce instructor relationship with proper foreign key.',
      },
    ],
    validationRules: [
      {
        id: 'v4_course_exists',
        description: '`courses` table has `instructor_id` foreign key',
        validate: (tables) => {
          const courses = tables.find((t) => t.name.toLowerCase() === 'courses');
          if (!courses) return { passed: false, message: 'Missing `courses` table' };
          const instFk = courses.columns.find((c) => c.name.toLowerCase() === 'instructor_id');
          if (!instFk) return { passed: false, message: '`courses` missing `instructor_id` column' };
          return { passed: true, message: '`courses` table with instructor relationship configured' };
        },
      },
    ],
    hints: [
      'Create `courses` table with `instructor_id` referencing `users(id)`.',
      'Add `status` column with default value "\'draft\'".',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 5,
    title: 'Curriculum Hierarchy: Course Sections',
    category: 'Curriculum Structure',
    estimatedMinutes: 6,
    overview:
      'Courses are split into modular chapters called Sections (e.g. "Module 1: Introduction to SQL", "Module 2: Joins & Aggregations").',
    architectureContext:
      'Sections must support custom instructor ordering. Adding a `sort_order` integer field allows drag-and-drop syllabus rearrangement.',
    scaleConsiderations: [
      'Composite index on `(course_id, sort_order)` speeds up syllabus loading without sorting overhead in memory.',
    ],
    tasks: [
      {
        id: 't5_1',
        text: 'Create `sections` table',
        detail: 'Include `id`, `course_id` (FK), `title`, and `sort_order` (INT).',
      },
      {
        id: 't5_2',
        text: 'Link `sections.course_id` to `courses.id`',
        detail: 'Ensure CASCADE delete so removing a course cleans up its sections.',
      },
    ],
    validationRules: [
      {
        id: 'v5_sec_exists',
        description: '`sections` table properly references `courses`',
        validate: (tables) => {
          const sec = tables.find((t) => t.name.toLowerCase() === 'sections');
          if (!sec) return { passed: false, message: 'Missing `sections` table' };
          const fk = sec.columns.find((c) => c.name.toLowerCase() === 'course_id');
          if (!fk) return { passed: false, message: '`sections` requires `course_id` column' };
          return { passed: true, message: '`sections` curriculum table verified' };
        },
      },
    ],
    hints: [
      'Create table `sections` and connect its `course_id` to `courses.id`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 6,
    title: 'Lessons & Streaming Video Metadata',
    category: 'Curriculum Structure',
    estimatedMinutes: 7,
    overview:
      'Model individual lessons inside sections (video playback URLs, duration, article content, and preview flags).',
    architectureContext:
      'Crucial sys0 architectural rule: NEVER store video binary blobs in the relational DB! Store CDN / HLS playback URLs and video durations in seconds.',
    scaleConsiderations: [
      'Store `duration_seconds` as INT for easy sum calculations of total course runtime.',
      '`is_preview` (BOOLEAN) allows unauthorized visitors to sample lecture 1 without enrollment.',
    ],
    tasks: [
      {
        id: 't6_1',
        text: 'Create `lessons` table',
        detail: 'Include `id`, `section_id` (FK), `title`, `content_type`, `video_url`, `duration_seconds`, `is_preview`, `sort_order`.',
      },
      {
        id: 't6_2',
        text: 'Connect `lessons.section_id` to `sections.id`',
        detail: 'Cascade delete from section to lesson.',
      },
    ],
    validationRules: [
      {
        id: 'v6_lesson_exists',
        description: '`lessons` references `sections` with duration and video metadata',
        validate: (tables) => {
          const l = tables.find((t) => t.name.toLowerCase() === 'lessons');
          if (!l) return { passed: false, message: 'Missing `lessons` table' };
          const fk = l.columns.find((c) => c.name.toLowerCase() === 'section_id');
          if (!fk) return { passed: false, message: '`lessons` requires `section_id` foreign key' };
          return { passed: true, message: '`lessons` table structured for streaming assets' };
        },
      },
    ],
    hints: [
      'Add `lessons` table and link `section_id` to `sections.id`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 7,
    title: 'Enrollments & Course Access',
    category: 'Access & Monetization',
    estimatedMinutes: 6,
    overview:
      'Model the many-to-many relationship connecting students to courses they have legitimately purchased or enrolled in.',
    architectureContext:
      'Enrollment verification runs on every single video request. Therefore, checking `(student_id, course_id)` must be instant.',
    scaleConsiderations: [
      'Enforce COMPOSITE UNIQUE constraint on `(student_id, course_id)` to prevent double enrollments.',
      'Index `student_id` to power "My Learning" dashboard queries.',
    ],
    tasks: [
      {
        id: 't7_1',
        text: 'Create `enrollments` table',
        detail: 'Define `id`, `student_id` (FK to users), `course_id` (FK to courses), `enrolled_at`.',
      },
      {
        id: 't7_2',
        text: 'Enforce uniqueness and indexing',
        detail: 'Add foreign keys and mark `student_id` & `course_id` with composite unique constraint.',
      },
    ],
    validationRules: [
      {
        id: 'v7_enrollments',
        description: '`enrollments` table connects users and courses',
        validate: (tables) => {
          const enr = tables.find((t) => t.name.toLowerCase() === 'enrollments');
          if (!enr) return { passed: false, message: 'Missing `enrollments` table' };
          const sFk = enr.columns.find((c) => c.name.toLowerCase() === 'student_id');
          const cFk = enr.columns.find((c) => c.name.toLowerCase() === 'course_id');
          if (!sFk || !cFk) return { passed: false, message: '`enrollments` needs both `student_id` and `course_id` FKs' };
          return { passed: true, message: '`enrollments` junction entity properly configured' };
        },
      },
    ],
    hints: [
      'Add table `enrollments`.',
      'Add FK `student_id` -> `users.id` and FK `course_id` -> `courses.id`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 8,
    title: 'Granular Lesson Progress Tracking',
    category: 'Learning Analytics',
    estimatedMinutes: 7,
    overview:
      'Track when individual students complete specific lessons to drive the course progress percentage bar and unlock completion certificates.',
    architectureContext:
      'When an LMS has 100k students watching 50 lessons each, this table scales to 5,000,000+ rows quickly. Row updates must be lean.',
    scaleConsiderations: [
      'Composite Unique `(student_id, lesson_id)` is strictly required.',
      'Use BOOLEAN `is_completed` and TIMESTAMP `completed_at`.',
    ],
    tasks: [
      {
        id: 't8_1',
        text: 'Create `lesson_progress` table',
        detail: 'Columns: `id`, `student_id` (FK), `lesson_id` (FK), `is_completed` (BOOLEAN), `completed_at` (TIMESTAMP).',
      },
    ],
    validationRules: [
      {
        id: 'v8_progress',
        description: '`lesson_progress` table references both students and lessons',
        validate: (tables) => {
          const lp = tables.find(
            (t) => t.name.toLowerCase() === 'lesson_progress' || t.name.toLowerCase() === 'student_progress'
          );
          if (!lp) return { passed: false, message: 'Missing `lesson_progress` table' };
          const s = lp.columns.find((c) => c.name.toLowerCase() === 'student_id');
          const l = lp.columns.find((c) => c.name.toLowerCase() === 'lesson_id');
          if (!s || !l) return { passed: false, message: 'Must contain `student_id` and `lesson_id`' };
          return { passed: true, message: 'Lesson progress tracker created' };
        },
      },
    ],
    hints: [
      'Create `lesson_progress` table.',
      'Include `student_id`, `lesson_id`, `is_completed`, and `completed_at`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 9,
    title: 'High-Concurrency Video Heartbeats & Resume Playback',
    category: 'High-Scale Architecture',
    estimatedMinutes: 9,
    overview:
      'Solve the core sys0 challenge: Every active viewer sends a playback heartbeat every 5–10 seconds ("Continue Watching at 14:32"). How do you structure this without locking the database?',
    architectureContext:
      'Writing to the primary `lesson_progress` table on every heartbeat causes severe row lock contention and index thrashing. We design an isolated `video_playback_sessions` table with atomic upserts (or Redis buffering) to decouple write spikes.',
    scaleConsiderations: [
      'Separate ephemeral resume timestamp (`last_watched_second`) from immutable completion audit records.',
      'Single row per (student, lesson) using `UPSERT ... ON CONFLICT DO UPDATE`.',
      'Index on `(student_id, updated_at DESC)` powers the Netflix/Udemy "Continue Watching" carousel instantly.',
    ],
    tasks: [
      {
        id: 't9_1',
        text: 'Create `video_playback_sessions` table',
        detail: 'Columns: `id`, `student_id` (FK), `lesson_id` (FK), `last_watched_second` (INT), `updated_at` (TIMESTAMP).',
      },
      {
        id: 't9_2',
        text: 'Add composite index for Continue Watching feed',
        detail: 'Ensure `student_id` is indexed for rapid resume queries.',
      },
    ],
    validationRules: [
      {
        id: 'v9_heartbeat',
        description: 'Isolated playback session entity exists with timestamp tracker',
        validate: (tables) => {
          const vps = tables.find(
            (t) =>
              t.name.toLowerCase() === 'video_playback_sessions' ||
              t.name.toLowerCase() === 'playback_sessions' ||
              t.name.toLowerCase() === 'watch_progress'
          );
          if (!vps) return { passed: false, message: 'Missing `video_playback_sessions` table' };
          const colSec = vps.columns.find(
            (c) => c.name.toLowerCase().includes('second') || c.name.toLowerCase().includes('position')
          );
          if (!colSec) return { passed: false, message: 'Need `last_watched_second` position column' };
          return { passed: true, message: 'High-concurrency video heartbeat table ready' };
        },
      },
    ],
    hints: [
      'Name table `video_playback_sessions`.',
      'Columns: `id`, `student_id`, `lesson_id`, `last_watched_second`, `updated_at`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 10,
    title: 'Student Reviews & Star Ratings',
    category: 'Social Proof',
    estimatedMinutes: 6,
    overview:
      'Allow enrolled students to submit a 1 to 5-star rating and written review for a course.',
    architectureContext:
      'Business constraint: A student can review a given course ONLY ONCE, and should be verified as an active student enrolled in that course.',
    scaleConsiderations: [
      'Enforce CHECK constraint (rating >= 1 AND rating <= 5).',
      'Composite Unique `(student_id, course_id)` prevents spam reviews from duplicate submissions.',
      'Store aggregated average rating in `courses.average_rating` or calculate via async materialized view.',
    ],
    tasks: [
      {
        id: 't10_1',
        text: 'Create `reviews` table',
        detail: 'Columns: `id`, `course_id` (FK), `student_id` (FK), `rating` (INT), `comment` (TEXT), `created_at`.',
      },
    ],
    validationRules: [
      {
        id: 'v10_reviews',
        description: '`reviews` table models ratings tied to courses and students',
        validate: (tables) => {
          const r = tables.find((t) => t.name.toLowerCase() === 'reviews');
          if (!r) return { passed: false, message: 'Missing `reviews` table' };
          const rateCol = r.columns.find((c) => c.name.toLowerCase() === 'rating');
          if (!rateCol) return { passed: false, message: '`reviews` needs a `rating` column' };
          return { passed: true, message: 'Reviews and feedback entity modeled' };
        },
      },
    ],
    hints: [
      'Add `reviews` table with `course_id`, `student_id`, `rating`, `comment`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 11,
    title: 'Monetization: Payments & Coupons',
    category: 'Access & Monetization',
    estimatedMinutes: 8,
    overview:
      'Handle financial transactions, payment gateway references (Stripe, PayPal, Razorpay), promotional coupon codes, and platform revenue splits.',
    architectureContext:
      'Financial records require immutable transaction logs. A payment row must never be deleted; failed or refunded transactions are status-updated.',
    scaleConsiderations: [
      'Store `gateway_transaction_id` as indexed VARCHAR for idempotency webhook reconciliations.',
      'Decimal precision DECIMAL(10,2) avoids currency rounding issues.',
    ],
    tasks: [
      {
        id: 't11_1',
        text: 'Create `coupons` table',
        detail: 'Columns: `id`, `code` (Unique), `discount_percent` (INT), `expires_at`, `max_uses`.',
      },
      {
        id: 't11_2',
        text: 'Create `payments` table',
        detail: 'Columns: `id`, `student_id` (FK), `course_id` (FK), `amount_paid`, `coupon_id` (FK nullable), `status`, `gateway_transaction_id`.',
      },
    ],
    validationRules: [
      {
        id: 'v11_payments',
        description: '`payments` and `coupons` tables model monetization',
        validate: (tables) => {
          const pay = tables.find((t) => t.name.toLowerCase() === 'payments');
          const coup = tables.find((t) => t.name.toLowerCase() === 'coupons');
          if (!pay) return { passed: false, message: 'Missing `payments` table' };
          if (!coup) return { passed: false, message: 'Missing `coupons` table' };
          return { passed: true, message: 'Payments and discount coupon models active' };
        },
      },
    ],
    hints: [
      'Create `coupons` with `code` (Unique).',
      'Create `payments` with `amount_paid`, `status`, and `gateway_transaction_id`.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 12,
    title: 'Certificates of Completion',
    category: 'Learning Analytics',
    estimatedMinutes: 5,
    overview:
      'Issue cryptographically verifiable certificates once a student completes 100% of lessons in a course.',
    architectureContext:
      'Each certificate contains a unique public verification hash code (e.g. `CERT-8X92-2026`) that anyone can verify without needing an LMS login.',
    scaleConsiderations: [
      'Unique index on `verification_code` powers instant public authenticity verification checks.',
      'Unique composite on `(student_id, course_id)` prevents issuing multiple certificates to the same person.',
    ],
    tasks: [
      {
        id: 't12_1',
        text: 'Create `certificates` table',
        detail: 'Columns: `id`, `student_id` (FK), `course_id` (FK), `verification_code` (Unique), `issued_at`.',
      },
    ],
    validationRules: [
      {
        id: 'v12_certs',
        description: '`certificates` table configured with unique verification code',
        validate: (tables) => {
          const cert = tables.find((t) => t.name.toLowerCase() === 'certificates');
          if (!cert) return { passed: false, message: 'Missing `certificates` table' };
          const code = cert.columns.find(
            (c) => c.name.toLowerCase().includes('code') || c.name.toLowerCase().includes('hash')
          );
          if (!code) return { passed: false, message: 'Needs unique `verification_code` column' };
          return { passed: true, message: 'Certificates verification model created' };
        },
      },
    ],
    hints: [
      'Add table `certificates` with `verification_code` (marked Unique).',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 13,
    title: 'Production Indexing & High-Traffic Tuning',
    category: 'Performance Tuning',
    estimatedMinutes: 7,
    overview:
      'Examine foreign keys and critical read paths to ensure every query avoids costly sequential table scans under load.',
    architectureContext:
      'In PostgreSQL and MySQL, foreign key columns are NOT automatically indexed. Failing to index FKs causes parent table updates or deletes to acquire full table locks!',
    scaleConsiderations: [
      'Every FK column (`student_id`, `course_id`, `section_id`) MUST have an index.',
      'Composite indexes `(course_id, status)` accelerate catalog filtering.',
      'Composite index `(student_id, course_id)` in enrollments speeds up access checks.',
    ],
    tasks: [
      {
        id: 't13_1',
        text: 'Ensure foreign keys have indexes',
        detail: 'Verify `IDX` indicator is toggled on foreign keys like `student_id`, `course_id`, `section_id`.',
      },
      {
        id: 't13_2',
        text: 'Review query plans',
        detail: 'Use the SQL EXPLAIN simulator to test index scan vs seq scan costs.',
      },
    ],
    validationRules: [
      {
        id: 'v13_indexes',
        description: 'High-traffic foreign key columns have indexes enabled',
        validate: (tables) => {
          let indexedCount = 0;
          tables.forEach((t) => {
            t.columns.forEach((c) => {
              if (c.isIndexed) indexedCount++;
            });
          });
          if (indexedCount < 8) {
            return {
              passed: false,
              message: `Only found ${indexedCount} indexed columns. Ensure FKs and search keys have IDX enabled!`,
            };
          }
          return { passed: true, message: `Excellent! ${indexedCount} columns indexed for low latency.` };
        },
      },
    ],
    hints: [
      'Open table column settings and toggle the "IDX" flag on important lookup columns.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },

  {
    stepNumber: 14,
    title: 'Final Schema Review & Production DDL Export',
    category: 'Production Readiness',
    estimatedMinutes: 6,
    overview:
      'Congratulations! You have arrived at Step 14 of the sys0 LMS Database Lab. Review the complete relational architecture, inspect foreign key constraints, run production DDL exports, and verify your schema is battle-ready for millions of students.',
    architectureContext:
      'A production-ready database schema balances 3NF normalization with selective denormalization for scale. With clean foreign keys, isolated high-frequency video playback writes, and strategic indexing, this architecture easily scales to hundreds of thousands of concurrent learners.',
    scaleConsiderations: [
      'Schema cleanly separates Auth (`users`), Catalog (`courses`, `sections`, `lessons`), Access (`enrollments`), and High-Frequency Streaming (`video_playback_sessions`).',
      'DDL scripts ready for instant deployment into PostgreSQL, MySQL, Supabase, Neon, or PlanetScale.',
      'Supports automated Prisma migrations and DBML visual documentation.',
    ],
    tasks: [
      {
        id: 't14_1',
        text: 'Verify complete 12+ table architecture',
        detail: 'Confirm all entities: users, profiles, categories, subcategories, courses, sections, lessons, enrollments, lesson_progress, video_playback_sessions, reviews, payments, coupons, certificates.',
      },
      {
        id: 't14_2',
        text: 'Generate and copy production PostgreSQL DDL',
        detail: 'Open the SQL Generator tab and export the complete migration script.',
      },
    ],
    validationRules: [
      {
        id: 'v14_all_tables',
        description: 'Complete LMS architecture (at least 10 core tables defined)',
        validate: (tables) => {
          if (tables.length < 10) {
            return {
              passed: false,
              message: `Currently have ${tables.length} tables. A complete production LMS lab requires at least 10 core tables. Use "Load Complete LMS Schema" to inspect the full architecture!`,
            };
          }
          return { passed: true, message: `Full LMS architecture complete with ${tables.length} production tables!` };
        },
      },
    ],
    hints: [
      'Click "Load Complete LMS Schema" in the header or toolbar to populate all 14 tables instantly!',
      'Review foreign key connection lines across all modules.',
    ],
    starterTables: [],
    solutionTables: [],
    solutionRelations: [],
  },
];
