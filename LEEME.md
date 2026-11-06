# LinkGen

Generador de páginas de links (tipo Linktree) para tus clientes.
Abres el panel, eliges el rubro, completas los datos, pulsas **Finalizar y publicar** y obtienes el link listo para compartir: `negocio.woditek.com`.

## Estructura

```
LinkGen/
├─ client/    Página pública + panel (/admin). Vite · React · TypeScript · Tailwind · fuente Archivo.
│             Se compila a client/dist y Nginx lo sirve como archivos estáticos.
└─ service/   API en Node (Express) conectada a SQL Server. PM2 la mantiene corriendo.
```

```
Navegador ──► Cloudflare ──► Nginx (VPS) ──► client/dist     (negocio.woditek.com, admin.woditek.com)
                         └─► Nginx (VPS) ──► service (PM2)   (api.woditek.com) ──► SQL Server, base "LinkGen"
```

Publicar un negocio solo lo guarda en la base de datos. **No hay que crear nada en Nginx ni en Cloudflare por cada cliente**: un bloque comodín de Nginx atiende cualquier `*.woditek.com`, y la página lee el subdominio para saber qué negocio mostrar.

Base de datos `LinkGen`:
- `Usuarios` → `Id`, `Correo`, `ClaveHash`, `CreadoEn`
- `Sitios` → `Enlace`, `Datos`, `UsuarioId`, `CreadoEn`, `ActualizadoEn`

Para recrearla en otro servidor: `npm --prefix service run setup-db`.

---

## 1) En tu computadora

Necesitas Node.js 18+.

```bash
npm run install:all
```

Crea tu usuario del panel (una vez):
```bash
npm --prefix service run create-admin -- tu@correo.com TuContraseña
```

Archivos de configuración (no se suben a Git):
- `service/.env`: copia `service/.env.example` y completa SQL Server y `JWT_SECRET`. Usa `PORT=3101`.
- `client/.env`: copia `client/.env.example`. Para desarrollo:
  ```
  VITE_API_URL=http://localhost:3101
  VITE_BASE_DOMAIN=woditek.com
  ```

Cada vez que lo uses, en dos terminales:
```bash
npm run dev:service
```
```bash
npm run dev:client
```

Abre <http://localhost:5173/admin>. Una página de cliente se ve en `http://localhost:5173/?c=nombre`.

## 2) Publicar en el VPS (Nginx + PM2)

Así está montado hoy: carpeta `/var/www/LinkGen`, API en el puerto 3101.

### A. DNS en Cloudflare
- `*` → registro `A`, `89.117.58.11`, **nube naranja (Proxied)**.
- `api` → registro `A`, `89.117.58.11`, nube naranja.

Tus registros con nombre exacto (`sunat`, `barberia`, etc.) no se tocan: un registro exacto siempre gana al comodín.

### B. La API (`service/`)

```bash
cd /var/www/LinkGen/service
npm install
cp .env.example .env && nano .env      # SQL Server, JWT_SECRET (openssl rand -hex 48), PORT=3101
pm2 start npm --name linkgen-api -- start
pm2 save
```

Prueba: `curl http://localhost:3101/api/health` → `{"ok":true}`.

### C. La página (`client/`)

```bash
cd /var/www/LinkGen/client
npm install
npm run build
```

Usa `client/.env.production` (`VITE_API_URL=https://api.woditek.com`), así que no hace falta `.env` en el VPS. Genera `client/dist`.

### D. Certificado de origen de Cloudflare

Un solo certificado cubre `*.woditek.com` (la API y todos los clientes). Es gratis y dura 15 años.

1. Cloudflare → tu dominio → **SSL/TLS → Origin Server → Create Certificate**.
2. RSA 2048, hostnames `*.woditek.com` y `woditek.com`, 15 años.
3. Guarda los dos textos en el VPS (la clave privada solo se muestra una vez y **nunca** se comparte):
   ```bash
   mkdir -p /etc/ssl/cloudflare
   nano /etc/ssl/cloudflare/woditek.pem     # Origin Certificate
   nano /etc/ssl/cloudflare/woditek.key     # Private Key
   chmod 600 /etc/ssl/cloudflare/woditek.key
   ```
4. En Cloudflare, **SSL/TLS → Overview** debe estar en **Full** o **Full (strict)**.

Este certificado solo funciona detrás del proxy de Cloudflare (nube naranja).

### E. Nginx

Se agregan dos bloques a tus archivos existentes. Antes, haz copias `.bak` de cada uno.

**`/etc/nginx/sites-available/frontend`** (al final, después de la última llave):

```nginx
# LINKGEN: cualquier *.woditek.com (páginas de clientes y admin.woditek.com)
# Los server_name exactos de tus otros sitios tienen prioridad sobre este comodín.
server {
    listen 80;
    server_name *.woditek.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name *.woditek.com;

    root /var/www/LinkGen/client/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri /index.html;
    }

    ssl_certificate /etc/ssl/cloudflare/woditek.pem;
    ssl_certificate_key /etc/ssl/cloudflare/woditek.key;
}
```

**`/etc/nginx/sites-available/app-backend`** (al final):

```nginx
# LINKGEN API: api.woditek.com (puerto 3101)
server {
    listen 80;
    server_name api.woditek.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.woditek.com;

    # Los logos de los negocios viajan dentro de la petición
    client_max_body_size 5M;

    ssl_certificate /etc/ssl/cloudflare/woditek.pem;
    ssl_certificate_key /etc/ssl/cloudflare/woditek.key;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Valida y recarga (si `nginx -t` falla, no recargues y vuelve a la copia `.bak`):
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### F. Usarlo
1. Abre `https://admin.woditek.com/admin` e inicia sesión.
2. **Generar nuevo link** → elige el rubro → completa los datos.
3. **Finalizar y publicar** → copia el link (o descarga el QR) y pásaselo al cliente.

## 3) Actualizar después de cambios

En el VPS:
```bash
cd /var/www/LinkGen && git pull
```
- Si cambió `service/`: `cd service && npm install && pm2 restart linkgen-api`
- Si cambió `client/`: `cd client && npm install && npm run build` (Nginx sirve lo nuevo al instante, sin reiniciar)

## Seguridad

- **Usuario `sa`:** es el administrador total de SQL Server. Lo ideal es un usuario solo para LinkGen con permisos únicamente sobre la base `LinkGen`, y ponerlo en `service/.env`.
- **Puerto 1435 de SQL Server:** como la API corre en el mismo VPS, ciérralo al público con el firewall y usa `SQLSERVER_SERVER=localhost:1435`.
- **Contraseñas compartidas en chats:** cámbialas (la de `sa` y la del panel; la del panel se cambia repitiendo `create-admin`).
- El panel pide correo y contraseña; las sesiones duran 14 días y hay límite de intentos de login.
- `service/.env` y las claves de `/etc/ssl/cloudflare/` nunca se suben a Git.

## Nombres reservados

No se pueden usar como link de un cliente: `admin`, `www`, `app`, `mail`, `api`, etc., y tus subdominios actuales. La lista está en `client/src/lib/util.ts` (`RESERVED`). **Cada vez que crees un subdominio propio nuevo (con su propio bloque en Nginx), agrégalo ahí y vuelve a compilar el cliente.**

## Límites que conviene conocer

- **Vista previa al compartir el link:** como la página se arma en el navegador, WhatsApp/Facebook no muestran el logo ni el nombre del negocio al pegar el link (en la biografía de Instagram no se nota).
- **Estadísticas de clics:** no incluidas todavía.
- **PDF de la carta o de precios:** pega el link de Google Drive/Dropbox en el botón.
- Si cambias la dirección de un link ya publicado, el anterior deja de funcionar (el panel te lo avisa).
