DROP FUNCTION IF EXISTS get_cursos_visibles();

CREATE OR REPLACE FUNCTION get_cursos_visibles()
RETURNS TABLE (
  id            uuid,
  titulo        text,
  descripcion   text,
  imagen_banner text,
  duracion_estimada text,
  categoria_id  uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    c.id,
    c.titulo,
    c.descripcion,
    c.imagen_banner,
    c.duracion_estimada,
    c.categoria_id
  FROM cursos c
  WHERE (
      -- Destinatario directo
      EXISTS (
        SELECT 1 FROM cursos_destinatarios cd
        WHERE cd.curso_id = c.id
          AND cd.user_id = auth.uid()
      )
      OR
      -- Regla de visibilidad por perfil
      EXISTS (
        SELECT 1
        FROM cursos_visibilidad cv
        JOIN profiles p ON p.id = auth.uid()
        WHERE cv.curso_id = c.id
          AND (
            cv.campo = 'job_title'       AND cv.valor = p.job_title       OR
            cv.campo = 'department'      AND cv.valor = p.department      OR
            cv.campo = 'office_location' AND cv.valor = p.office_location
          )
      )
    )
  ORDER BY c.titulo;
$$;
