-- ============================================
-- TABELLE PRINCIPALI
-- ============================================

-- Tabella Utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('mentor', 'mentee')),
    bio TEXT,
    sector VARCHAR(255),
    languages TEXT[] DEFAULT ARRAY['italiano'],
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    avatar_url VARCHAR(500),
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Tabella Sessioni Disponibili
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 60,
    available BOOLEAN DEFAULT TRUE,
    meeting_url VARCHAR(500),
    meeting_password VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Tabella Prenotazioni
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
    meeting_url VARCHAR(500),
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Recensioni
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    response_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Messaggi
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Notifiche
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Pagamenti
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255) UNIQUE,
    stripe_session_id VARCHAR(255),
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Coda Email
CREATE TABLE email_queue (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Template Email
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Coda Task
CREATE TABLE task_queue (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    task_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retries INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Report Giornalieri
CREATE TABLE daily_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Log Sistema
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Token Reset Password
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Verifica Email
CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Migrazioni
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_rating ON users(rating) WHERE role = 'mentor';
CREATE INDEX idx_users_sector ON users(sector) WHERE role = 'mentor';

CREATE INDEX idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX idx_sessions_available ON sessions(available);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_mentor_available ON sessions(mentor_id, available) WHERE available = TRUE;

CREATE INDEX idx_bookings_mentor ON bookings(mentor_id);
CREATE INDEX idx_bookings_mentee ON bookings(mentee_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at);
CREATE INDEX idx_bookings_session ON bookings(session_id);

CREATE INDEX idx_reviews_mentor ON reviews(mentor_id);
CREATE INDEX idx_reviews_mentee ON reviews(mentee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created ON reviews(created_at);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(read);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX idx_email_queue_pending ON email_queue(status) WHERE status = 'pending';

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_scheduled ON task_queue(scheduled_at);

CREATE INDEX idx_system_logs_created ON system_logs(created_at);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_user ON system_logs(user_id);

-- ============================================
-- TRIGGER E FUNZIONI
-- ============================================

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per bookings
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per email_templates
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Funzione per calcolare rating mentor automaticamente
CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE mentor_id = NEW.mentor_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE mentor_id = NEW.mentor_id
        )
    WHERE id = NEW.mentor_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mentor_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW 
    EXECUTE FUNCTION update_mentor_rating();

-- Funzione per notifica nuova prenotazione
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, booking_id, title, message)
    VALUES 
        (NEW.mentor_id, 'new_booking', NEW.id, 'Nuova Prenotazione', 'Hai ricevuto una nuova prenotazione!'),
        (NEW.mentee_id, 'booking_confirmed', NEW.id, 'Prenotazione Confermata', 'La tua prenotazione è stata confermata!');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER notify_new_booking_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW 
    EXECUTE FUNCTION notify_new_booking();

-- Funzione per notifica nuovo messaggio
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (NEW.recipient_id, 'new_message', 'Nuovo Messaggio', 'Hai ricevuto un nuovo messaggio');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER notify_new_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW 
    EXECUTE FUNCTION notify_new_message();

-- ============================================
-- FUNZIONI UTILITY
-- ============================================

-- Funzione per ottenere statistiche utente
CREATE OR REPLACE FUNCTION get_user_stats(user_id_param INTEGER)
RETURNS TABLE (
    total_bookings BIGINT,
    completed_sessions BIGINT,
    upcoming_sessions BIGINT,
    total_spent NUMERIC,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'confirmed' AND s.start_time > NOW()) as upcoming_sessions,
        COALESCE(SUM(p.amount), 0) as total_spent,
        COALESCE(AVG(r.rating), 0) as avg_rating
    FROM bookings b
    LEFT JOIN sessions s ON b.session_id = s.id
    LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
    LEFT JOIN reviews r ON b.id = r.booking_id
    WHERE b.mentee_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Funzione per cercare mentor
CREATE OR REPLACE FUNCTION search_mentors(
    search_sector VARCHAR DEFAULT NULL,
    search_language VARCHAR DEFAULT NULL,
    min_rating_param NUMERIC DEFAULT 0,
    max_rate_param NUMERIC DEFAULT 999999
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    bio TEXT,
    sector VARCHAR,
    languages TEXT[],
    hourly_rate NUMERIC,
    rating NUMERIC,
    review_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.bio,
        u.sector,
        u.languages,
        u.hourly_rate,
        u.rating,
        u.review_count
    FROM users u
    WHERE u.role = 'mentor'
        AND (search_sector IS NULL OR LOWER(u.sector) LIKE '%' || LOWER(search_sector) || '%')
        AND (search_language IS NULL OR EXISTS (
            SELECT 1 FROM unnest(u.languages) lang 
            WHERE LOWER(lang) LIKE '%' || LOWER(search_language) || '%'
        ))
        AND u.rating >= min_rating_param
        AND u.hourly_rate <= max_rate_param
    ORDER BY u.rating DESC, u.review_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATI INIZIALI - TEMPLATE EMAIL
-- ============================================

INSERT INTO email_templates (name, subject, body, variables) VALUES
('welcome', 'Benvenuto su MentorMatch!', 
 'Ciao {{name}}, benvenuto su MentorMatch! Siamo felici di averti con noi.',
 '{"name": "string"}'::jsonb),
 
('booking_confirmation', 'Prenotazione Confermata',
 'Ciao {{userName}}, la tua sessione con {{mentorName}} è confermata per il {{date}} alle {{time}}.',
 '{"userName": "string", "mentorName": "string", "date": "string", "time": "string"}'::jsonb),
 
('booking_reminder', 'Promemoria Sessione',
 'Ciao {{userName}}, ricordati della tua sessione con {{mentorName}} domani alle {{time}}!',
 '{"userName": "string", "mentorName": "string", "time": "string"}'::jsonb),
 
('new_review', 'Nuova Recensione Ricevuta',
 'Ciao {{mentorName}}, hai ricevuto una nuova recensione da {{menteeName}}: {{rating}} stelle!',
 '{"mentorName": "string", "menteeName": "string", "rating": "number"}'::jsonb),
 
('new_message', 'Nuovo Messaggio',
 'Ciao {{recipientName}}, hai ricevuto un nuovo messaggio da {{senderName}}.',
 '{"recipientName": "string", "senderName": "string"}'::jsonb)
ON CONFLICT (name) DO NOTHING;