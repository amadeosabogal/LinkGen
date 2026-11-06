# LinkGen

Generador de páginas de links (tipo Linktree) para tus clientes.
Abres el panel, eliges el rubro, completas los datos, pulsas **Finalizar y publicar** y obtienes el link listo para compartir: `negocio.woditek.com`.

**Tecnologías:** Vite · React · TypeScript · Tailwind CSS 4 · tipografía Archivo · API Node (Express) · SQL Server.

## Piezas

```
Navegador ──► LinkGen (Cloudflare Worker, *.woditek.com) ──► API Node (api.woditek.com) ──► SQL Server (base "LinkGen")
```

| Carpeta / archivo | Para qué sirve |
|---|---|
| `src/` | La app: página pública del cliente y panel (`/admin`). |
| `src/lib/presets.ts` | Plantillas por rubro. Agrega las tuyas aquí. |
| `server/` | La API que habla con SQL Server. Se instala en tu VPS. |
| `server/.env` | Credenciales de SQL Server y clave de sesiones. **Secreto: nunca lo subas a GitHub.** |
| `.env` (raíz) | Solo dos datos públicos: `VITE_API_URL` y `VITE_BASE_DOMAIN`. |
| `wrangler.jsonc` | Configuración del despliegue en Cloudflare. |

La base de datos `LinkGen` ya fue creada con las tablas `Usuarios` (tu acceso al panel) y `Sitios` (los negocios).
Para recrearla en otro servidor: `npm --prefix server run setup-db`.

---

## 1) Probarlo en tu computadora

Necesitas Node.js 18+. Todo desde la carpeta del proyecto.

**Una sola vez:**
```bash
npm install
```
```bash
npm --prefix server install
```

**Crea tu usuario del panel** (elige tu correo y una contraseña de 8+ caracteres):
```bash
npm --prefix server run create-admin -- tu@correo.com TuContraseña
```

**Crea el archivo `.env` en la raíz** (copia `.env.example`) con:
```
VITE_API_URL=http://localhost:3101
```

**Cada vez que quieras usarlo, en dos terminales:**
```bash
npm run server
```
```bash
npm run dev
```

Abre <http://localhost:5173/admin> e inicia sesión. Sin `VITE_API_URL`, la app funciona en modo prueba (datos solo en tu navegador).

## 2) Publicarlo (para que los clientes lo vean)

### A. La API en tu VPS (`api.woditek.com`)

1. **DNS:** en Cloudflare crea un registro `A`, nombre `api`, contenido `89.117.58.11`, y **desactiva la nube naranja (DNS only)**. Tiene que ir en gris: con la naranja, la ruta comodín de LinkGen la interceptaría.
2. **Copia la carpeta `server/`** a tu VPS (sin `node_modules`), por ejemplo a `/opt/linkgen-server`.
3. En el VPS, dentro de esa carpeta:
   ```bash
   npm install
   ```
   Revisa que `.env` tenga tus datos. En el VPS puedes poner `SQLSERVER_SERVER=localhost:1435`.
4. **Déjala corriendo siempre** con PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name linkgen-api -- start
   pm2 save
   pm2 startup
   ```
5. **HTTPS para `api.woditek.com`.** Lo más simple es Caddy (saca el certificado solo). Archivo `Caddyfile`:
   ```
   api.woditek.com {
     reverse_proxy localhost:3101
   }
   ```
   Si ya usas Nginx en el VPS, haz un `server` para `api.woditek.com` que haga `proxy_pass` a `http://localhost:3101` y emite el certificado con Certbot.
6. Prueba en el navegador: `https://api.woditek.com/api/health` debe responder `{"ok":true}`.

### B. LinkGen en Cloudflare con subdominios automáticos

La idea: configuras UNA vez un subdominio comodín (`*.woditek.com`). Desde entonces `cualquiernombre.woditek.com` abre LinkGen, que lee el subdominio y muestra ese negocio. **No hay que crear nada en Cloudflare por cada cliente.**

1. **Subdominios que ya tienes:** como la ruta comodín intercepta lo que pasa por la nube naranja, tus subdominios propios deben estar en **DNS only** (nube gris). `woditek.com` y `www` ya lo están.
2. **Registro comodín:** tipo `AAAA`, nombre `*`, dirección `100::`, **nube naranja activada**. (`100::` es una dirección de relleno; el tráfico lo atiende el Worker.)
3. En el `.env` de la raíz:
   ```
   VITE_API_URL=https://api.woditek.com
   VITE_BASE_DOMAIN=woditek.com
   ```
   Estas variables se incorporan al compilar, así que van antes de desplegar.
4. Despliega (la primera vez te pedirá iniciar sesión en Cloudflare):
   ```bash
   npx wrangler@4 login
   ```
   ```bash
   npm run deploy
   ```
5. El certificado HTTPS gratuito de Cloudflare ya cubre `*.woditek.com`.

### C. Usarlo

1. Abre `https://admin.woditek.com/admin` (el nombre `admin` está reservado y funciona como puerta del panel) e inicia sesión.
2. **Generar nuevo link** → elige el rubro → completa nombre, logo, WhatsApp, URLs, dirección y colores.
3. **Finalizar y publicar** → copia el link (o descarga el QR) y pásaselo a tu cliente.

Para cambiar algo después, abre el cliente en el panel, edita y pulsa **Guardar cambios y publicar**.

## Seguridad: lo importante

- **Usuario `sa`:** es el administrador total de SQL Server. Lo ideal es crear un usuario solo para LinkGen con permisos únicamente sobre la base `LinkGen`, y poner ese usuario en `server/.env`.
- **Puerto 1435 abierto a internet:** si la API corre en el mismo VPS que SQL Server, cierra ese puerto al público (firewall) y deja que solo se use desde `localhost`.
- **Contraseña:** la contraseña de `sa` se compartió en un chat; cámbiala cuando termines de configurar.
- El panel pide correo y contraseña; las sesiones duran 14 días y hay límite de intentos de login.

## Nombres reservados

No se pueden usar como link de un cliente: `admin`, `www`, `app`, `mail`, `api`, etc., y tus subdominios actuales. La lista está en `src/lib/util.ts` (`RESERVED`). **Cada vez que crees un subdominio propio nuevo, agrégalo ahí** y ponlo en nube gris.

## Límites que conviene conocer

- **Vista previa al compartir el link:** como la página se arma en el navegador, WhatsApp/Facebook no muestran el logo ni el nombre del negocio al pegar el link (en la biografía de Instagram no se nota).
- **Estadísticas de clics:** no incluidas todavía.
- **PDF de la carta o de precios:** pega el link de Google Drive/Dropbox en el botón.
- Si cambias la dirección de un link ya publicado, el anterior deja de funcionar (el panel te lo avisa).
