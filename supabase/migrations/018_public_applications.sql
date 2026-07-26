-- Permet aux visiteurs (anon) de soumettre une candidature via le formulaire public
CREATE POLICY "public_submit_application"
  ON ats_applications FOR INSERT TO anon
  WITH CHECK (source = 'website');

-- Permet aux visiteurs d'uploader CV et lettre dans le dossier applications/
CREATE POLICY "public_applications_upload"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'applications');
