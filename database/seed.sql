-- ============================================
-- DATI DI TEST - UTENTI
-- ============================================

-- Password: Password123 (hashed con bcrypt)
INSERT INTO users (email, password, name, role, bio, sector, languages, hourly_rate) VALUES
-- MENTORS
('mario.rossi@mentor.com', 1, 'Mario Rossi', 'mentor', 
 'Senior Software Engineer con 15 anni di esperienza in sviluppo web full-stack. Esperto in React, Node.js e architetture cloud.', 
 'Sviluppo Software', ARRAY['italiano', 'inglese'], 80.00),

('giulia.bianchi@mentor.com', '2', 'Giulia Bianchi', 'mentor',
 'Marketing Manager e Digital Strategist. Ho aiutato oltre 50 startup a crescere attraverso strategie di marketing innovative.',
 'Marketing Digitale', ARRAY['italiano', 'inglese', 'spagnolo'], 70.00),

('luca.verdi@mentor.com', '3', 'Luca Verdi', 'mentor',
 'Data Scientist e Machine Learning Engineer. Specializzato in AI, analytics e ottimizzazione predittiva.',
 'Data Science', ARRAY['italiano', 'inglese', 'francese'], 90.00),

('anna.ferrari@mentor.com', '4', 'Anna Ferrari', 'mentor',
 'UX/UI Designer con passione per il design thinking. Creo esperienze utente memorabili e interface intuitive.',
 'Design', ARRAY['italiano', 'inglese'], 65.00),

('marco.colombo@mentor.com', '5', 'Marco Colombo', 'mentor',
 'Product Manager con esperienza in tech companies. Ti aiuto a trasformare idee in prodotti di successo.',
 'Product Management', ARRAY['italiano', 'inglese'], 75.00),

-- MENTEES
('francesco.bruno@mentee.com', '6', 'Francesco Bruno', 'mentee',
 'Studente universitario in Informatica, appassionato di programmazione e desideroso di imparare.',
 'Sviluppo Software', ARRAY['italiano'], NULL),

('chiara.costa@mentee.com', '7', 'Chiara Costa', 'mentee',
 'Neolaureata in Marketing, cerco orientamento per iniziare la mia carriera nel digitale.',
 'Marketing Digitale', ARRAY['italiano', 'inglese'], NULL),

('andrea.moretti@mentee.com', '8', 'Andrea Moretti', 'mentee',
 'Junior developer alla ricerca di mentorship per crescere professionalmente.',
 'Sviluppo Software', ARRAY['italiano'], NULL);

-- ============================================
-- DATI DI TEST - SESSIONI
-- ============================================

-- Sessioni per i prossimi 30 giorni
DO $$
DECLARE
    mentor_rec RECORD;
    day_offset INTEGER;
    session_time TIMESTAMP;
BEGIN
    FOR mentor_rec IN SELECT id FROM users WHERE role = 'mentor' LOOP
        FOR day_offset IN 1..30 LOOP
            -- Sessione alle 10:00
            session_time := (CURRENT_DATE + day_offset * INTERVAL '1 day') + INTERVAL '10 hours';
            INSERT INTO sessions (mentor_id, start_time, end_time, duration, available)
            VALUES (mentor_rec.id, session_time, session_time + INTERVAL '1 hour', 60, TRUE);
            
            -- Sessione alle 14:00
            session_time := (CURRENT_DATE + day_offset * INTERVAL '1 day') + INTERVAL '14 hours';
            INSERT INTO sessions (mentor_id, start_time, end_time, duration, available)
            VALUES (mentor_rec.id, session_time, session_time + INTERVAL '1 hour', 60, TRUE);
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- REGISTRA MIGRAZIONE
-- ============================================

INSERT INTO schema_migrations (version, name) 
VALUES ('001', 'initial_complete_schema');

-- ============================================
-- STATISTICHE FINALI
-- ============================================

DO $$
DECLARE
    user_count INTEGER;
    mentor_count INTEGER;
    mentee_count INTEGER;
    session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO mentor_count FROM users WHERE role = 'mentor';
    SELECT COUNT(*) INTO mentee_count FROM users WHERE role = 'mentee';
    SELECT COUNT(*) INTO session_count FROM sessions;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETATO CON SUCCESSO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Utenti totali: %', user_count;
    RAISE NOTICE 'Mentor: %', mentor_count;
    RAISE NOTICE 'Mentee: %', mentee_count;
    RAISE NOTICE 'Sessioni disponibili: %', session_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Credenziali di test:';
    RAISE NOTICE 'Email: mario.rossi@mentor.com (mentor)';
    RAISE NOTICE 'Email: francesco.bruno@mentee.com (mentee)';
    RAISE NOTICE 'Password: Password123';
    RAISE NOTICE '========================================';
END $$;