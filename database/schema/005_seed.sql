-- =============================================================================
-- SEÑAL — DATOS SEMILLA
-- Geografía de Guatemala, categorías base y configuración inicial.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- GEOGRAFÍA — Guatemala
-- ---------------------------------------------------------------------------

INSERT INTO app.countries (code, name) VALUES ('GT', 'Guatemala');

INSERT INTO app.departments (country_id, name, code) VALUES
(1, 'Guatemala',       'GT-GU'),
(1, 'Sacatepéquez',    'GT-SA'),
(1, 'Chimaltenango',   'GT-CM'),
(1, 'Escuintla',       'GT-ES'),
(1, 'Santa Rosa',      'GT-SR'),
(1, 'Sololá',          'GT-SO'),
(1, 'Totonicapán',     'GT-TO'),
(1, 'Quetzaltenango',  'GT-QZ'),
(1, 'Suchitepéquez',   'GT-SU'),
(1, 'Retalhuleu',      'GT-RE'),
(1, 'San Marcos',      'GT-SM'),
(1, 'Huehuetenango',   'GT-HU'),
(1, 'Quiché',          'GT-QC'),
(1, 'Baja Verapaz',    'GT-BV'),
(1, 'Alta Verapaz',    'GT-AV'),
(1, 'Petén',           'GT-PE'),
(1, 'Izabal',          'GT-IZ'),
(1, 'Zacapa',          'GT-ZA'),
(1, 'Chiquimula',      'GT-CQ'),
(1, 'Jalapa',          'GT-JA'),
(1, 'Jutiapa',         'GT-JU'),
(1, 'El Progreso',     'GT-PR');

-- Municipios de Guatemala (capital)
INSERT INTO app.municipalities (department_id, name) VALUES
(1, 'Guatemala'),
(1, 'Santa Catarina Pinula'),
(1, 'San José Pinula'),
(1, 'San José del Golfo'),
(1, 'Palencia'),
(1, 'Chinautla'),
(1, 'San Pedro Ayampuc'),
(1, 'Mixco'),
(1, 'San Pedro Sacatepéquez'),
(1, 'San Juan Sacatepéquez'),
(1, 'San Raymundo'),
(1, 'Chuarrancho'),
(1, 'Fraijanes'),
(1, 'Amatitlán'),
(1, 'Villa Nueva'),
(1, 'Villa Canales'),
(1, 'San Miguel Petapa');

-- Zonas de la Ciudad de Guatemala
INSERT INTO app.zones (municipality_id, name, zone_type, lat_centroid, lng_centroid) VALUES
(1, 'Zona 1',  'zona', 14.6433, -90.5133),
(1, 'Zona 2',  'zona', 14.6505, -90.5063),
(1, 'Zona 3',  'zona', 14.6480, -90.5200),
(1, 'Zona 4',  'zona', 14.6325, -90.5163),
(1, 'Zona 5',  'zona', 14.6302, -90.5079),
(1, 'Zona 6',  'zona', 14.6560, -90.5010),
(1, 'Zona 7',  'zona', 14.6395, -90.5350),
(1, 'Zona 8',  'zona', 14.6305, -90.5233),
(1, 'Zona 9',  'zona', 14.6250, -90.5130),
(1, 'Zona 10', 'zona', 14.6040, -90.5104),
(1, 'Zona 11', 'zona', 14.6195, -90.5280),
(1, 'Zona 12', 'zona', 14.6078, -90.5230),
(1, 'Zona 13', 'zona', 14.5916, -90.5218),
(1, 'Zona 14', 'zona', 14.5853, -90.5040),
(1, 'Zona 15', 'zona', 14.5990, -90.4870),
(1, 'Zona 16', 'zona', 14.5860, -90.4700),
(1, 'Zona 17', 'zona', 14.5720, -90.5030),
(1, 'Zona 18', 'zona', 14.6640, -90.4800),
(1, 'Zona 19', 'zona', 14.6460, -90.5500),
(1, 'Zona 21', 'zona', 14.5635, -90.5340),
-- Municipios adyacentes
(8,  'Centro', 'zona', 14.6308, -90.5939),  -- Mixco
(15, 'Centro', 'zona', 14.5258, -90.5891);  -- Villa Nueva

-- Quetzaltenango (Xela)
INSERT INTO app.municipalities (department_id, name) VALUES
(8, 'Quetzaltenango');

INSERT INTO app.zones (municipality_id, name, zone_type, lat_centroid, lng_centroid) VALUES
(22, 'Zona 1', 'zona', 14.8444, -91.5178),
(22, 'Zona 2', 'zona', 14.8380, -91.5100),
(22, 'Zona 3', 'zona', 14.8500, -91.5050);

-- ---------------------------------------------------------------------------
-- CATEGORÍAS — árbol de productos y servicios
-- ---------------------------------------------------------------------------

-- Raíces
INSERT INTO app.categories (id, parent_id, name, slug, sort_order) VALUES
(1,  NULL, 'Productos',            'productos',            1),
(2,  NULL, 'Servicios',            'servicios',            2),
(3,  NULL, 'Empleos y Trabajo',    'empleos-trabajo',      3),
(4,  NULL, 'Inmuebles',            'inmuebles',            4),
(5,  NULL, 'Vehículos',            'vehiculos',            5),
(6,  NULL, 'Educación',            'educacion',            6),
(7,  NULL, 'Tecnología',           'tecnologia',           7),
(8,  NULL, 'Salud y Bienestar',    'salud-bienestar',      8),
(9,  NULL, 'Alimentación',         'alimentacion',         9),
(10, NULL, 'Arte y Entretenimiento','arte-entretenimiento', 10);

-- Subcategorías: Productos
INSERT INTO app.categories (id, parent_id, name, slug) VALUES
(101, 1, 'Ropa y Accesorios',      'ropa-accesorios'),
(102, 1, 'Electrónica',            'electronica'),
(103, 1, 'Libros y Papelería',     'libros-papeleria'),
(104, 1, 'Hogar y Muebles',        'hogar-muebles'),
(105, 1, 'Herramientas',           'herramientas'),
(106, 1, 'Juguetes y Juegos',      'juguetes-juegos'),
(107, 1, 'Deportes',               'deportes'),
(108, 1, 'Mascotas',               'mascotas'),
(109, 1, 'Artesanías',             'artesanias'),
(110, 1, 'Agricultura e Insumos',  'agricultura-insumos');

-- Subcategorías: Servicios
INSERT INTO app.categories (id, parent_id, name, slug) VALUES
(201, 2, 'Reparaciones del Hogar', 'reparaciones-hogar'),
(202, 2, 'Limpieza',               'limpieza'),
(203, 2, 'Transporte y Mudanzas',  'transporte-mudanzas'),
(204, 2, 'Diseño Gráfico',         'diseno-grafico'),
(205, 2, 'Fotografía y Video',     'fotografia-video'),
(206, 2, 'Contabilidad y Legal',   'contabilidad-legal'),
(207, 2, 'Construcción',           'construccion'),
(208, 2, 'Seguridad',              'seguridad'),
(209, 2, 'Eventos',                'eventos'),
(210, 2, 'Marketing y Publicidad', 'marketing-publicidad');

-- Subcategorías: Educación
INSERT INTO app.categories (id, parent_id, name, slug) VALUES
(601, 6, 'Clases Particulares',    'clases-particulares'),
(602, 6, 'Idiomas',                'idiomas'),
(603, 6, 'Cursos Técnicos',        'cursos-tecnicos'),
(604, 6, 'Asesoría Académica',     'asesoria-academica');

-- Subcategorías: Tecnología
INSERT INTO app.categories (id, parent_id, name, slug) VALUES
(701, 7, 'Desarrollo de Software', 'desarrollo-software'),
(702, 7, 'Soporte Técnico',        'soporte-tecnico'),
(703, 7, 'Equipos Usados',         'equipos-usados'),
(704, 7, 'Ciberseguridad',         'ciberseguridad');

-- Subcategorías: Alimentación
INSERT INTO app.categories (id, parent_id, name, slug) VALUES
(901, 9, 'Comida a Domicilio',     'comida-domicilio'),
(902, 9, 'Catering',               'catering'),
(903, 9, 'Productos Orgánicos',    'productos-organicos'),
(904, 9, 'Repostería',             'reposteria');

-- Actualizar full_path en categorías
UPDATE app.categories c
SET full_path = CASE
    WHEN c.parent_id IS NULL THEN c.name
    ELSE (SELECT p.name FROM app.categories p WHERE p.id = c.parent_id) || ' / ' || c.name
END;

-- Sincronizar dimensión de categorías en el warehouse
INSERT INTO analytics.dim_categories (id, parent_id, name, slug, level, full_path)
SELECT
    c.id,
    c.parent_id,
    c.name,
    c.slug,
    CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
    COALESCE(p.name || ' / ', '') || c.name
FROM app.categories c
LEFT JOIN app.categories p ON p.id = c.parent_id
WHERE c.is_active = true
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_path = EXCLUDED.full_path,
    synced_at = now();

-- Sincronizar dimensión de zonas en el warehouse
INSERT INTO analytics.dim_zones (id, country_code, country_name, department_name, municipality, zone_name, zone_type, lat_centroid, lng_centroid)
SELECT
    z.id,
    co.code,
    co.name,
    d.name,
    m.name,
    z.name,
    z.zone_type,
    z.lat_centroid,
    z.lng_centroid
FROM app.zones z
JOIN app.municipalities m ON m.id = z.municipality_id
JOIN app.departments d    ON d.id = m.department_id
JOIN app.countries co     ON co.id = d.country_id
WHERE z.is_active = true
ON CONFLICT (id) DO UPDATE SET
    zone_name  = EXCLUDED.zone_name,
    synced_at  = now();
