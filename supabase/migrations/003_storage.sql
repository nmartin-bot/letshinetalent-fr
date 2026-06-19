-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admin users to upload/delete
CREATE POLICY "admin_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (SELECT is_admin()));

CREATE POLICY "admin_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (SELECT is_admin()));

-- Allow anyone to read (public bucket)
CREATE POLICY "public_documents_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'documents');
