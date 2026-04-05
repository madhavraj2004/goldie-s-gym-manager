
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can mark received messages as read
CREATE POLICY "Users can update read status"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for fast lookups
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
