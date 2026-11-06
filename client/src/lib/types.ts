export type BtnType = 'whatsapp' | 'link' | 'info' | 'mapa' | 'tel';
export type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'web' | 'maps';
export type BtnStyle = 'solido' | 'sombra' | 'borde';
export type Shape = 'redondeado' | 'pill' | 'recto';

export interface BgImage {
  /** Imagen en formato data:image/...;base64 */
  src: string;
  opacidad: number;   // 0-100
  desenfoque: number; // 0-20 (px)
  brillo: number;     // 40-160 (%)
  ajuste: 'cubrir' | 'ancho' | 'mosaico';
  posicion: 'arriba' | 'centro' | 'abajo';
  fijo: boolean;
}

export interface Theme {
  imagenFondo?: BgImage;
  colorPrincipal: string;
  fondo: string;
  texto: string;
  /** Color del nombre del negocio. Vacío = automático. */
  colorNombre?: string;
  /** Color de la descripción corta. Vacío = usa el color de texto. */
  colorDescripcion?: string;
  estiloBoton: BtnStyle;
  forma: Shape;
}

export interface Btn {
  id?: string;
  tipo: BtnType;
  texto: string;
  subtexto?: string;
  icono?: string;
  url?: string;
  numero?: string;
  mensaje?: string;
  contenido?: string;
  direccion?: string;
  telefono?: string;
}

/** Lo que se guarda en la base de datos y se muestra en la página pública. */
export interface SiteData {
  v?: number;
  rubro: string;
  marca: { nombre: string; bio: string; logo: string };
  tema: Theme;
  redes: Partial<Record<SocialKey, string>>;
  botones: Btn[];
}

/** Versión "completa" que se edita en el panel (todos los campos presentes). */
export type FullBtn = Required<Btn>;
export interface EditorData extends Omit<SiteData, 'redes' | 'botones'> {
  redes: Record<SocialKey, string>;
  botones: FullBtn[];
}
export interface Draft {
  slug: string;
  originalSlug: string;
  slugTouched: boolean;
  data: EditorData;
}

export interface Row {
  slug: string;
  data: SiteData;
  updated_at: string;
}
