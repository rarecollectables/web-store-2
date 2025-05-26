-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create guest_sessions table
CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contact_form_submissions table
CREATE TABLE IF NOT EXISTS contact_form_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_archive table
CREATE TABLE IF NOT EXISTS chat_archive (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID,
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES guest_sessions(session_id)
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID,
    response TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES guest_sessions(session_id)
);

-- Create chat_attempts table
CREATE TABLE IF NOT EXISTS chat_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES guest_sessions(session_id)
);

-- Create chat_analytics table
CREATE TABLE IF NOT EXISTS chat_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    session_id TEXT,
    event_type TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES guest_sessions(session_id)
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    shipping_type TEXT,
    shipping_cost NUMERIC,
    shipping_label TEXT,
    image_url TEXT,
    additional_images TEXT[],
    category TEXT,
    stock INTEGER DEFAULT 0,
    sku TEXT UNIQUE,
    rating DECIMAL(2, 1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    material TEXT,
    stone TEXT,
    size TEXT,
    length TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create policies for guest sessions
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to guest sessions"
    ON guest_sessions FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to guest sessions"
    ON guest_sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update access to guest sessions"
    ON guest_sessions FOR UPDATE
    USING (true);

-- Create policies for chat tables
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to chat history"
    ON chat_history FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to chat history"
    ON chat_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read access to chat attempts"
    ON chat_attempts FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to chat attempts"
    ON chat_attempts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read access to chat analytics"
    ON chat_analytics FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to chat analytics"
    ON chat_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read access to chat archive"
    ON chat_archive FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to chat archive"
    ON chat_archive FOR INSERT
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_archive_user ON chat_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_archive_session ON chat_archive(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session ON guest_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attempts_session ON chat_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attempts_success ON chat_attempts(success);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_user ON chat_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_session ON chat_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_event ON chat_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update updated_at timestamps
DO $$ BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_guest_sessions_updated_at ON guest_sessions;
    DROP TRIGGER IF EXISTS update_chat_history_updated_at ON chat_history;
    DROP TRIGGER IF EXISTS update_chat_attempts_updated_at ON chat_attempts;
    DROP TRIGGER IF EXISTS update_chat_analytics_updated_at ON chat_analytics;
    DROP TRIGGER IF EXISTS update_chat_archive_updated_at ON chat_archive;

    -- Create new triggers
    CREATE TRIGGER update_guest_sessions_updated_at
        BEFORE UPDATE ON guest_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_chat_history_updated_at
        BEFORE UPDATE ON chat_history
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_chat_attempts_updated_at
        BEFORE UPDATE ON chat_attempts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_chat_analytics_updated_at
        BEFORE UPDATE ON chat_analytics
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_chat_archive_updated_at
        BEFORE UPDATE ON chat_archive
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating triggers: %', SQLERRM;
END $$;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
-- Allow anonymous read access
DO $$ BEGIN
    CREATE POLICY "Allow public read access"
        ON products FOR SELECT
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Allow anonymous insert access (for export script)
DO $$ BEGIN
    CREATE POLICY "Allow public insert access"
        ON products FOR INSERT
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Allow anonymous update access (for export script)
DO $$ BEGIN
    CREATE POLICY "Allow public update access"
        ON products FOR UPDATE
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create policies for storage bucket
-- Allow public to read from products bucket
DO $$ BEGIN
    CREATE POLICY "Allow public read access to products bucket"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'products'
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Allow public to upload to products bucket
DO $$ BEGIN
    CREATE POLICY "Allow public upload to products bucket"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'products'
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create product variants table (for different sizes/colors)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2),
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address JSONB,
    billing_address JSONB,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(10, 2), -- Stripe payment amount
    payment_intent_id TEXT, -- Stripe PaymentIntent ID
    currency VARCHAR(10), -- Payment currency
    contact_email VARCHAR(255), -- Customer email for confirmation
    product_image TEXT, -- Product image URL
    quantity INTEGER, -- Product quantity
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create chat tables
CREATE TABLE IF NOT EXISTS guest_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES guest_sessions(id)
);

CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_guest_messages_session ON guest_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_processed ON guest_messages(is_processed);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_user ON guest_sessions(user_id);

-- Create indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_chat_archive_user ON chat_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_archive_session ON chat_archive(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_user ON guest_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_attempts_session ON chat_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attempts_success ON chat_attempts(success);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- Create checkout_attempts table
CREATE TABLE IF NOT EXISTS checkout_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guest_session_id TEXT NOT NULL,
    email TEXT,
    contact JSONB,
    address JSONB,
    cart JSONB,
    status TEXT DEFAULT 'started',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update updated_at timestamps
DO $$ BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
    DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
    DROP TRIGGER IF EXISTS update_wishlist_items_updated_at ON wishlist_items;
    DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
    DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
    DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;

    -- Create new triggers
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_product_variants_updated_at
        BEFORE UPDATE ON product_variants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_cart_items_updated_at
        BEFORE UPDATE ON cart_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_wishlist_items_updated_at
        BEFORE UPDATE ON wishlist_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_order_items_updated_at
        BEFORE UPDATE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_reviews_updated_at
        BEFORE UPDATE ON reviews
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating triggers: %', SQLERRM;
END $$;

-- Track user events for analytics and behavior
CREATE TABLE IF NOT EXISTS user_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    event_type TEXT NOT NULL,
    product_id UUID,
    quantity INTEGER,
    device TEXT,
    location JSONB,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
