-- MENTORMATCH DATABASE

-- Extension necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Per ricerca full-text

-- ============================================
-- SCHEMA PRINCIPALE
-- ============================================

-- Tabella Utenti con tutti i campi necessari
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('mentor', 'mentee', 'admin')),
    
    -- Profilo
    bio TEXT,
    sector VARCHAR(255),
    specializations TEXT[],
    languages TEXT[] DEFAULT ARRAY['italiano'],
    timezone VARCHAR(100) DEFAULT 'Europe/Rome',
    
    -- Dati professionali
    company VARCHAR(255),
    job_title VARCHAR(255),
    years_experience INTEGER,
    linkedin_url VARCHAR(500),
    website_url VARCHAR(500),
    
    -- Mentor specifici
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- Media
    avatar_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    
    -- Integrazioni
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    google_calendar_token TEXT,
    zoom_api_key VARCHAR(255),
    
    -- Preferenze
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT TRUE,
    
    -- Verifica e sicurezza
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_login_at TIMESTAMP,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Search
    search_vector tsvector
);

-- Tabella Profili Mentor (info aggiuntive)
CREATE TABLE mentor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Descrizione estesa
    headline VARCHAR(500),
    about_me TEXT,
    teaching_style TEXT,
    ideal_mentee TEXT,
    
    -- Expertise
    skills TEXT[],
    certifications JSONB,
    achievements JSONB,
    
    -- Disponibilità
    weekly_hours INTEGER,
    response_time_hours INTEGER DEFAULT 24,
    
    -- Video intro
    intro_video_url VARCHAR(500),
    
    -- Stats
    completion_rate DECIMAL(5, 2) DEFAULT 100.00,
    response_rate DECIMAL(5, 2) DEFAULT 100.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Sessioni con gestione completa
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    timezone VARCHAR(100) DEFAULT 'Europe/Rome',
    
    -- Disponibilità
    available BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(255), -- RRULE format
    
    -- Meeting info
    meeting_platform VARCHAR(50) DEFAULT 'zoom', -- zoom, google_meet, teams, phone
    meeting_url VARCHAR(500),
    meeting_password VARCHAR(100),
    meeting_id VARCHAR(255),
    
    -- Pricing
    price DECIMAL(10, 2),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time CHECK (end_time > start_time)
);

-- Tabella Prenotazioni completa
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dettagli
    title VARCHAR(255),
    description TEXT,
    mentee_goals TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    
    -- Meeting details
    meeting_url VARCHAR(500),
    meeting_notes TEXT,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancellation_type VARCHAR(50), -- user, admin, auto
    
    -- Completion
    completed_at TIMESTAMP,
    mentor_attended BOOLEAN,
    mentee_attended BOOLEAN,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    next_session_scheduled BOOLEAN DEFAULT FALSE,
    
    -- Reminders sent
    reminder_24h_sent BOOLEAN DEFAULT FALSE,
    reminder_1h_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Recensioni estesa
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Ratings dettagliati
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    
    -- Contenuto
    title VARCHAR(255),
    comment TEXT,
    pros TEXT,
    cons TEXT,
    
    -- Response
    response TEXT,
    response_at TIMESTAMP,
    
    -- Metadata
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Messaggi con threading
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    conversation_id INTEGER,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contenuto
    subject VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Attachments
    attachments JSONB,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    starred BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    
    -- Reply
    reply_to INTEGER REFERENCES messages(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Notifiche
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo e priorità
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Contenuto
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    
    -- Data
    data JSONB,
    
    -- Riferimenti
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Delivery
    sent_email BOOLEAN DEFAULT FALSE,
    sent_push BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Tabella Pagamenti completa
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES users(id),
    payee_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Importo
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    platform_fee DECIMAL(10, 2),
    mentor_earning DECIMAL(10, 2),
    
    -- Payment details
    payment_method VARCHAR(100),
    payment_provider VARCHAR(50) DEFAULT 'stripe',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')),
    
    -- Transaction IDs
    transaction_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Refund
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    -- Payout
    payout_status VARCHAR(50) DEFAULT 'pending',
    payout_id VARCHAR(255),
    payout_date TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Categorie
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    parent_id INTEGER REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Skills/Competenze
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella User Skills (many-to-many)
CREATE TABLE user_skills (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER,
    PRIMARY KEY (user_id, skill_id)
);

-- Tabella Availability Templates
CREATE TABLE availability_templates (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Blocchi di indisponibilità
CREATE TABLE unavailability_blocks (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Wishlist/Favorites
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, mentor_id)
);

-- Tabella Pacchetti/Bundles
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    num_sessions INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2),
    validity_days INTEGER DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Acquisti Pacchetti
CREATE TABLE package_purchases (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    mentee_id INTEGER NOT NULL REFERENCES users(id),
    sessions_used INTEGER DEFAULT 0,
    sessions_remaining INTEGER,
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Certificati
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Educazione
CREATE TABLE education (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Esperienza Lavorativa
CREATE TABLE work_experience (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Coupon/Promozioni
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Uso Coupon
CREATE TABLE coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    booking_id INTEGER REFERENCES bookings(id),
    discount_applied DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Referral Program
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id),
    referred_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    reward_amount DECIMAL(10, 2),
    reward_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Blog/Articoli
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    category_id INTEGER REFERENCES categories(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    views_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella FAQ
CREATE TABLE faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Support Tickets
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Tabella Audit Log
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Analytics/Metrics
CREATE TABLE user_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    metric_date DATE NOT NULL,
    profile_views INTEGER DEFAULT 0,
    session_requests INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, metric_date)
);

-- ============================================
-- INDICI OTTIMIZZATI
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_featured ON users(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_users_sector ON users(sector) WHERE role = 'mentor';
CREATE INDEX idx_users_rating ON users(rating DESC) WHERE role = 'mentor';
CREATE INDEX idx_users_search ON users USING gin(search_vector);

-- Sessions
CREATE INDEX idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX idx_sessions_available ON sessions(available, start_time) WHERE available = TRUE;
CREATE INDEX idx_sessions_time_range ON sessions(start_time, end_time);
CREATE INDEX idx_sessions_upcoming ON sessions(start_time) WHERE start_time > NOW() AND available = TRUE;

-- Bookings
CREATE INDEX idx_bookings_mentor ON bookings(mentor_id);
CREATE INDEX idx_bookings_mentee ON bookings(mentee_id);
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_upcoming ON bookings(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- Reviews
CREATE INDEX idx_reviews_mentor ON reviews(mentor_id);
CREATE INDEX idx_reviews_mentee ON reviews(mentee_id);
CREATE INDEX idx_reviews_rating ON reviews(overall_rating);
CREATE INDEX idx_reviews_featured ON reviews(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Messages
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id, read) WHERE read = FALSE;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);

-- Payments
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- Skills
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);

-- Favorites
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_mentor ON favorites(mentor_id);

-- Analytics
CREATE INDEX idx_user_metrics_user_date ON user_metrics(user_id, metric_date DESC);

-- ============================================
-- TRIGGER E FUNZIONI
-- ============================================

-- Updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mentor_profiles_updated BEFORE UPDATE ON mentor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Aggiornamento rating mentor
CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET 
        rating = (
            SELECT ROUND(AVG(overall_rating)::numeric, 2) 
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER rating_update AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_mentor_rating();

-- Notifiche automatiche per nuove prenotazioni
CREATE OR REPLACE FUNCTION notify_booking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, booking_id, priority) VALUES
        (NEW.mentor_id, 'new_booking', 'Nuova Prenotazione', 
         'Hai ricevuto una nuova richiesta di sessione', NEW.id, 'high'),
        (NEW.mentee_id, 'booking_confirmed', 'Prenotazione Confermata', 
         'La tua prenotazione è stata confermata', NEW.id, 'normal');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_booking AFTER INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION notify_booking();

-- Notifica nuovi messaggi
CREATE OR REPLACE FUNCTION notify_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, message_id)
    VALUES (NEW.recipient_id, 'new_message', 'Nuovo Messaggio', 
            'Hai ricevuto un nuovo messaggio', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_message();

-- Aggiorna search vector per ricerca full-text
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('italian', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('italian', COALESCE(NEW.bio, '')), 'B') ||
        setweight(to_tsvector('italian', COALESCE(NEW.sector, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_update BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Aggiorna contatore sessioni totali
CREATE OR REPLACE FUNCTION update_session_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE users SET total_sessions = total_sessions + 1 
        WHERE id = NEW.mentor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_count_update AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_session_count();

-- Calcola sessioni rimanenti nel pacchetto
CREATE OR REPLACE FUNCTION update_package_remaining()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE package_purchases 
    SET sessions_remaining = (
        SELECT num_sessions FROM packages WHERE id = NEW.package_id
    ) - NEW.sessions_used
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER package_remaining_update AFTER UPDATE ON package_purchases
    FOR EACH ROW EXECUTE FUNCTION update_package_remaining();

-- ============================================
-- VISTE UTILI
-- ============================================

-- Vista mentor completi
CREATE VIEW v_mentors_complete AS
SELECT 
    u.*,
    mp.headline,
    mp.about_me,
    mp.skills,
    mp.completion_rate,
    mp.response_rate,
    COALESCE(s.available_sessions, 0) as available_sessions,
    COALESCE(r.recent_reviews, 0) as recent_reviews
FROM users u
LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
LEFT JOIN (
    SELECT mentor_id, COUNT(*) as available_sessions
    FROM sessions
    WHERE available = TRUE AND start_time > NOW()
    GROUP BY mentor_id
) s ON u.id = s.mentor_id
LEFT JOIN (
    SELECT mentor_id, COUNT(*) as recent_reviews
    FROM reviews
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY mentor_id
) r ON u.id = r.mentor_id
WHERE u.role = 'mentor' AND u.is_active = TRUE AND u.deleted_at IS NULL;

-- Vista booking con dettagli
CREATE VIEW v_bookings_detailed AS
SELECT 
    b.*,
    mentor.name as mentor_name,
    mentor.email as mentor_email,
    mentee.name as mentee_name,
    mentee.email as mentee_email,
    s.start_time,
    s.end_time,
    s.duration,
    p.amount as payment_amount,
    p.status as payment_status
FROM bookings b
JOIN users mentor ON b.mentor_id = mentor.id
JOIN users mentee ON b.mentee_id = mentee.id
JOIN sessions s ON b.session_id = s.id
LEFT JOIN payments p ON b.id = p.booking_id;

-- ============================================
-- FUNZIONI STORED PROCEDURE
-- ============================================

-- Ricerca mentor avanzata
CREATE OR REPLACE FUNCTION search_mentors(
    p_search_text TEXT DEFAULT NULL,
    p_sector VARCHAR DEFAULT NULL,
    p_language VARCHAR DEFAULT NULL,
    p_min_rating DECIMAL DEFAULT 0,
    p_max_rate DECIMAL DEFAULT 999999,
    p_has_availability BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    bio TEXT,
    sector VARCHAR,
    hourly_rate DECIMAL,
    rating DECIMAL,
    review_count INTEGER,
    total_sessions INTEGER,
    available_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.id,
        u.name,
        u.bio,
        u.sector,
        u.hourly_rate,
        u.rating,
        u.review_count,
        u.total_sessions,
        COUNT(s.id) FILTER (WHERE s.available = TRUE) as available_sessions
    FROM users u
    LEFT JOIN sessions s ON u.id = s.mentor_id AND s.start_time > NOW()
    WHERE u.role = 'mentor'
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
        AND (p_search_text IS NULL OR u.search_vector @@ plainto_tsquery('italian', p_search_text))
        AND (p_sector IS NULL OR LOWER(u.sector) LIKE '%' || LOWER(p_sector) || '%')
        AND (p_language IS NULL OR p_language = ANY(u.languages))
        AND u.rating >= p_min_rating
        AND u.hourly_rate <= p_max_rate
        AND (NOT p_has_availability OR EXISTS (
            SELECT 1 FROM sessions 
            WHERE mentor_id = u.id 
            AND available = TRUE 
            AND start_time > NOW()
        ))
    GROUP BY u.id
    ORDER BY u.rating DESC, u.review_count DESC;
END;
$ LANGUAGE plpgsql;

-- Statistiche utente complete
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id INTEGER)
RETURNS JSON AS $
DECLARE
    result JSON;
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    IF user_role = 'mentor' THEN
        SELECT json_build_object(
            'total_bookings', COUNT(*),
            'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
            'upcoming_sessions', COUNT(*) FILTER (WHERE status = 'confirmed'),
            'cancelled_sessions', COUNT(*) FILTER (WHERE status = 'cancelled'),
            'total_earnings', COALESCE(SUM(p.mentor_earning), 0),
            'avg_rating', (SELECT rating FROM users WHERE id = p_user_id),
            'total_reviews', (SELECT review_count FROM users WHERE id = p_user_id),
            'response_rate', (SELECT response_rate FROM mentor_profiles WHERE user_id = p_user_id)
        ) INTO result
        FROM bookings b
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.mentor_id = p_user_id;
    ELSE
        SELECT json_build_object(
            'total_bookings', COUNT(*),
            'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
            'upcoming_sessions', COUNT(*) FILTER (WHERE status = 'confirmed'),
            'total_spent', COALESCE(SUM(p.amount), 0),
            'favorite_mentors', (SELECT COUNT(*) FROM favorites WHERE user_id = p_user_id)
        ) INTO result
        FROM bookings b
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.mentee_id = p_user_id;
    END IF;
    
    RETURN result;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- DATI INIZIALI - CATEGORIE
-- ============================================

INSERT INTO categories (name, slug, description, display_order) VALUES
('Sviluppo Software', 'sviluppo-software', 'Programmazione e sviluppo', 1),
('Design', 'design', 'UX/UI e Design Grafico', 2),
('Marketing', 'marketing', 'Digital Marketing e Strategy', 3),
('Business', 'business', 'Management e Imprenditoria', 4),
('Data Science', 'data-science', 'Analisi Dati e Machine Learning', 5),
('Career Coaching', 'career-coaching', 'Orientamento Carriera', 6);

-- ============================================
-- DATI INIZIALI - SKILLS
-- ============================================

INSERT INTO skills (name, category_id) VALUES
('JavaScript', 1), ('Python', 1), ('React', 1), ('Node.js', 1),
('UI Design', 2), ('UX Research', 2), ('Figma', 2),
('SEO', 3), ('Content Marketing', 3), ('Social Media', 3),
('Leadership', 4), ('Project Management', 4), ('Strategy', 4),
('Machine Learning', 5), ('SQL', 5), ('Data Visualization', 5),
('Resume Writing', 6), ('Interview Prep', 6), ('Networking', 6);

-- ============================================
-- DATI TEST - UTENTI
-- ============================================

-- Admin
INSERT INTO users (email, password, name, role, is_active) VALUES
('admin@mentormatch.com', '1','Admin User', 'admin', TRUE);

-- Mentors (Password: password123)
INSERT INTO users (email, password, name, surname, role, bio, sector, languages, hourly_rate, email_verified, is_active, is_featured) VALUES
('mario.rossi@mentor.com', '2','Mario', 'Rossi', 'mentor',
 'Senior Full-Stack Developer con 15+ anni di esperienza. Specializzato in React, Node.js e architetture cloud scalabili.',
 'Sviluppo Software', ARRAY['italiano', 'inglese'], 80.00, TRUE, TRUE, TRUE),

('giulia.bianchi@mentor.com', '3','Giulia', 'Bianchi', 'mentor',
 'Digital Marketing Strategist. Ho aiutato 50+ startup a crescere attraverso strategie innovative.',
 'Marketing', ARRAY['italiano', 'inglese', 'spagnolo'], 70.00, TRUE, TRUE, TRUE),

('luca.verdi@mentor.com', '4','Luca', 'Verdi', 'mentor',
 'Lead Data Scientist specializzato in ML e AI. PhD in Computer Science.',
 'Data Science', ARRAY['italiano', 'inglese', 'francese'], 90.00, TRUE, TRUE, FALSE),

('anna.ferrari@mentor.com', '5','Anna', 'Ferrari', 'mentor',
 'Senior UX/UI Designer con focus su design systems e user research.',
 'Design', ARRAY['italiano', 'inglese'], 65.00, TRUE, TRUE, FALSE),

('marco.colombo@mentor.com', '6','Marco', 'Colombo', 'mentor',
 'Product Manager con esperienza in FAANG. Trasformo idee in prodotti di successo.',
 'Business', ARRAY['italiano', 'inglese'], 75.00, TRUE, TRUE, TRUE);

-- Mentees
INSERT INTO users (email, password, name, surname, role, bio, sector, languages, email_verified, is_active) VALUES
('francesco.bruno@test.com', '7','Francesco', 'Bruno', 'mentee',
 'Studente di Informatica appassionato di programmazione.',
 'Sviluppo Software', ARRAY['italiano'], TRUE, TRUE),

('chiara.costa@test.com', '8','Chiara', 'Costa', 'mentee',
 'Neolaureata in Marketing in cerca di orientamento.',
 'Marketing', ARRAY['italiano', 'inglese'], TRUE, TRUE),

('andrea.moretti@test.com', '9','Andrea', 'Moretti', 'mentee',
 'Junior developer alla ricerca di mentorship.',
 'Sviluppo Software', ARRAY['italiano'], TRUE, TRUE);

-- Mentor Profiles
INSERT INTO mentor_profiles (user_id, headline, about_me, skills, weekly_hours) VALUES
(2, 'Full-Stack Developer | React & Node.js Expert', 
 'Aiuto sviluppatori a crescere attraverso best practices e architetture scalabili.',
 ARRAY['JavaScript', 'React', 'Node.js', 'AWS'],
 20),
(3, 'Digital Marketing Strategist | Growth Hacking',
 'Specializzata in strategie data-driven per startup e PMI.',
 ARRAY['SEO', 'Content Marketing', 'Analytics'],
 15),
(4, 'Lead Data Scientist | ML & AI',
 'Trasformo dati in insights azionabili.',
 ARRAY['Python', 'Machine Learning', 'TensorFlow'],
 10);

-- User Skills
INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_experience) VALUES
(2, 1, 'expert', 15), (2, 3, 'expert', 10), (2, 4, 'expert', 12),
(3, 8, 'expert', 8), (3, 9, 'advanced', 7),
(4, 2, 'expert', 12), (4, 14, 'expert', 10);

-- Sessioni per i prossimi 30 giorni
INSERT INTO sessions (mentor_id, start_time, end_time, duration, price)
SELECT 
    m.id,
    d::date + interval '10 hours' as start_time,
    d::date + interval '11 hours' as end_time,
    60,
    m.hourly_rate
FROM users m
CROSS JOIN generate_series(CURRENT_DATE + 1, CURRENT_DATE + 30, '1 day') d
WHERE m.role = 'mentor'
UNION ALL
SELECT 
    m.id,
    d::date + interval '14 hours' as start_time,
    d::date + interval '15 hours' as end_time,
    60,
    m.hourly_rate
FROM users m
CROSS JOIN generate_series(CURRENT_DATE + 1, CURRENT_DATE + 30, '1 day') d
WHERE m.role = 'mentor'
UNION ALL
SELECT 
    m.id,
    d::date + interval '16 hours' as start_time,
    d::date + interval '17 hours' as end_time,
    60,
    m.hourly_rate
FROM users m
CROSS JOIN generate_series(CURRENT_DATE + 1, CURRENT_DATE + 30, '1 day') d
WHERE m.role = 'mentor';

-- FAQ
INSERT INTO faqs (question, answer, category, display_order) VALUES
('Come funziona MentorMatch?', 'MentorMatch connette mentor esperti con persone in cerca di orientamento professionale attraverso sessioni 1-on-1.', 'Generale', 1),
('Come posso diventare mentor?', 'Registrati come mentor, completa il tuo profilo con le tue competenze e inizia a ricevere richieste!', 'Mentor', 2),
('Come prenoto una sessione?', 'Cerca un mentor, visualizza la sua disponibilità e prenota la sessione che preferisci.', 'Prenotazioni', 3),
('Posso cancellare una sessione?', 'Sì, puoi cancellare fino a 24 ore prima. Cancellazioni tardive potrebbero non essere rimborsate.', 'Prenotazioni', 4);

-- Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, usage_limit, valid_until, is_active) VALUES
('WELCOME10', 'Sconto 10% per nuovi utenti', 'percentage', 10.00, 1000, NOW() + INTERVAL '90 days', TRUE),
('FIRST50', 'Sconto 50% prima sessione', 'percentage', 50.00, 500, NOW() + INTERVAL '30 days', TRUE);

-- ============================================
-- REPORT FINALE
-- ============================================

DO $ 
DECLARE
    v_users INTEGER;
    v_mentors INTEGER;
    v_mentees INTEGER;
    v_sessions INTEGER;
    v_categories INTEGER;
    v_skills INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users FROM users WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO v_mentors FROM users WHERE role = 'mentor' AND deleted_at IS NULL;
    SELECT COUNT(*) INTO v_mentees FROM users WHERE role = 'mentee' AND deleted_at IS NULL;
    SELECT COUNT(*) INTO v_sessions FROM sessions;
    SELECT COUNT(*) INTO v_categories FROM categories;
    SELECT COUNT(*) INTO v_skills FROM skills;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Statistiche:';
    RAISE NOTICE '- Utenti totali: %', v_users;
    RAISE NOTICE '- Mentor: %', v_mentors;
    RAISE NOTICE '- Mentee: %', v_mentees;
    RAISE NOTICE '- Sessioni disponibili: %', v_sessions;
    RAISE NOTICE '- Categorie: %', v_categories;
    RAISE NOTICE '- Skills: %', v_skills;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Credenziali Test:';
    RAISE NOTICE 'Admin: admin@mentormatch.com';
    RAISE NOTICE 'Mentor: mario.rossi@mentor.com';
    RAISE NOTICE 'Mentee: francesco.bruno@test.com';
    RAISE NOTICE 'Password (tutti): password123';
    RAISE NOTICE '========================================';
END $;