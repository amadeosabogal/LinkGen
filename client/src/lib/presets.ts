import type { Btn, Theme } from './types';

export interface Preset {
  etiqueta: string;
  emoji: string;
  data: { marca: { nombre: string; bio: string; logo: string }; tema: Theme; botones: Btn[] };
}

// Plantillas por rubro. Para agregar un rubro nuevo, copia un bloque y cámbiale los textos.
// Los campos vacíos (número, URLs, dirección) se completan en el panel antes de publicar.
export const PRESETS: Record<string, Preset> = {
  spa: {
    etiqueta: 'Spa de belleza', emoji: '💆‍♀️',
    data: {
      marca: { nombre: '', bio: '💆‍♀️ Spa de belleza y bienestar · Tu momento de relajación 🌿', logo: '' },
      tema: { colorPrincipal: '#8E5AA8', fondo: '#F6F0F8', texto: '#2B2133', estiloBoton: 'solido', forma: 'pill' },
      botones: [
        { tipo: 'whatsapp', texto: 'Reserva tu cita 💜', mensaje: 'Hola, quiero reservar una cita en el spa 💆‍♀️' },
        {
          tipo: 'info', texto: '¿Quiénes somos y cómo atendemos?',
          contenido: 'Somos un spa de belleza y bienestar pensado para que te desconectes y te sientas increíble.\n\nAtendemos con cita previa, de lunes a sábado de 9:00 a. m. a 8:00 p. m.\n\nNuestras especialistas están certificadas y usamos productos de primera calidad.\n\nReserva por WhatsApp y te confirmamos tu horario en minutos.'
        },
        { tipo: 'link', texto: 'Servicios y precios', icono: 'list' },
        { tipo: 'link', texto: 'Promos del mes 🎁', icono: 'gift' },
        { tipo: 'mapa', texto: '¿Cómo llegar?' },
        { tipo: 'link', texto: 'Déjanos tu reseña en Google ⭐', icono: 'star' }
      ]
    }
  },

  hamburgueseria: {
    etiqueta: 'Hamburguesería', emoji: '🍔',
    data: {
      marca: { nombre: '', bio: '🍔 Burgers de barrio de calidad premium 😎', logo: '' },
      tema: { colorPrincipal: '#0B4FBF', fondo: '#F0F0F0', texto: '#111111', estiloBoton: 'sombra', forma: 'redondeado' },
      botones: [
        { tipo: 'whatsapp', texto: 'Quiero hacer un pedido 💙🍔!', mensaje: 'Hola, quiero hacer un pedido 🍔' },
        {
          tipo: 'info', texto: '¿Quiénes somos y cómo atendemos?',
          contenido: 'Somos una hamburguesería de barrio con ingredientes frescos y recetas propias.\n\nAtendemos de martes a domingo, de 6:00 p. m. a 11:00 p. m.\n\nPedidos por WhatsApp, delivery y recojo en local.'
        },
        { tipo: 'link', texto: 'CARTA', icono: 'list' },
        { tipo: 'mapa', texto: '¿Cómo llegar?' }
      ]
    }
  },

  barberia: {
    etiqueta: 'Barbería', emoji: '💈',
    data: {
      marca: { nombre: '', bio: '💈 Cortes, barba y estilo · Reserva tu turno', logo: '' },
      tema: { colorPrincipal: '#C8A24A', fondo: '#121212', texto: '#F2F2F2', estiloBoton: 'solido', forma: 'recto' },
      botones: [
        { tipo: 'whatsapp', texto: 'Reservar mi turno ✂️', mensaje: 'Hola, quiero reservar un turno ✂️' },
        { tipo: 'link', texto: 'Servicios y precios', icono: 'list' },
        {
          tipo: 'info', texto: 'Horarios y cómo atendemos',
          contenido: 'Atendemos de lunes a sábado, de 10:00 a. m. a 9:00 p. m.\n\nTrabajamos con turno previo para que no esperes.\n\nPuedes pagar en efectivo, tarjeta o billetera digital.'
        },
        { tipo: 'mapa', texto: '¿Cómo llegar?' }
      ]
    }
  },

  blanco: {
    etiqueta: 'En blanco', emoji: '✨',
    data: {
      marca: { nombre: '', bio: '', logo: '' },
      tema: { colorPrincipal: '#1d4ed8', fondo: '#F3F3F3', texto: '#111111', estiloBoton: 'solido', forma: 'redondeado' },
      botones: [{ tipo: 'whatsapp', texto: 'Escríbenos por WhatsApp' }]
    }
  }
};
