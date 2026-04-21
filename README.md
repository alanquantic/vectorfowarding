# Vector Static Site

Version estatica en `HTML + CSS + JS` del sitio `vectorforwarding.com.mx`, preparada para subir directo a GitHub y desplegar en Vercel sin build step.

## Estructura

- `index.html`: pagina principal con metadatos SEO
- `assets/css/styles.css`: estilos del sitio
- `assets/js/main.js`: sliders ligeros, menu movil y formulario
- `assets/images/`: logos e imagenes descargadas del sitio original
- `robots.txt` y `sitemap.xml`: base SEO
- `vercel.json`: headers y redirecciones 301 desde URLs antiguas de WordPress

## Despliegue

1. Sube este repo a GitHub.
2. Importa el repo en Vercel.
3. Configura el dominio final si vas a reemplazar `vectorforwarding.com.mx`.

No hace falta comando de build.

## Ajustes recomendados antes de publicar

- Si cambias de dominio, actualiza:
  - `index.html` en `canonical`, `og:url`, `og:image`, JSON-LD
  - `robots.txt`
  - `sitemap.xml`
- Si usaras otro correo de contacto, cambia `data-contact-email` en `index.html`.

## Suposicion aplicada

El WordPress actual no expone correo, telefono o direccion reales en la home; las paginas de contacto encontradas tienen datos demo del template. Por eso deje el formulario listo para abrir un borrador de email usando `info@vectorforwarding.com.mx` como valor inicial facil de cambiar.
