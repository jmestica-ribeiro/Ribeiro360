-- Quita el límite explícito del bucket para que herede el global del proyecto
UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'herramientas-archivos';
