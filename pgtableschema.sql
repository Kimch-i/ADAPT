BEGIN;


CREATE TABLE IF NOT EXISTS public.assessments
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    skill text COLLATE pg_catalog."default" NOT NULL,
    priority priority_level NOT NULL,
    job_title text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assessments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.learning_paths
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    path_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT learning_paths_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.question_options
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    label character(1) COLLATE pg_catalog."default" NOT NULL,
    content text COLLATE pg_catalog."default" NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    explanation text COLLATE pg_catalog."default",
    CONSTRAINT question_options_pkey PRIMARY KEY (id),
    CONSTRAINT question_options_question_id_label_key UNIQUE (question_id, label)
);

CREATE TABLE IF NOT EXISTS public.questions
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    sequence_num integer NOT NULL,
    type question_type NOT NULL,
    approach text COLLATE pg_catalog."default" NOT NULL,
    question text COLLATE pg_catalog."default" NOT NULL,
    code_snippet text COLLATE pg_catalog."default",
    correct_answer text COLLATE pg_catalog."default" NOT NULL,
    explanation text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_assessment_id_sequence_num_key UNIQUE (assessment_id, sequence_num)
);

CREATE TABLE IF NOT EXISTS public.resources
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    skill text COLLATE pg_catalog."default" NOT NULL,
    title text COLLATE pg_catalog."default" NOT NULL,
    url text COLLATE pg_catalog."default" NOT NULL,
    type text COLLATE pg_catalog."default",
    source text COLLATE pg_catalog."default",
    thumbnail text COLLATE pg_catalog."default",
    is_approved boolean DEFAULT false,
    rating numeric(3, 2) DEFAULT 0,
    CONSTRAINT resources_pkey PRIMARY KEY (id),
    CONSTRAINT resources_url_key UNIQUE (url)
);

CREATE TABLE IF NOT EXISTS public.step_resources
(
    step_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    CONSTRAINT step_resources_pkey PRIMARY KEY (step_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.user_results
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    question_id uuid NOT NULL,
    selected_option text COLLATE pg_catalog."default",
    is_correct boolean,
    score numeric(5, 2) DEFAULT 0,
    answered_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_results_pkey PRIMARY KEY (id),
    CONSTRAINT user_results_user_id_question_id_key UNIQUE (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.users
(
    id serial NOT NULL,
    full_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password text COLLATE pg_catalog."default" NOT NULL,
    location character varying(255) COLLATE pg_catalog."default",
    preferred_job_title character varying(255) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

ALTER TABLE IF EXISTS public.assessments
    ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public.question_options
    ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id)
    REFERENCES public.questions (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public.questions
    ADD CONSTRAINT questions_assessment_id_fkey FOREIGN KEY (assessment_id)
    REFERENCES public.assessments (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public.step_resources
    ADD CONSTRAINT step_resources_resource_id_fkey FOREIGN KEY (resource_id)
    REFERENCES public.resources (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public.user_results
    ADD CONSTRAINT user_results_question_id_fkey FOREIGN KEY (question_id)
    REFERENCES public.questions (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public.user_results
    ADD CONSTRAINT user_results_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

END;