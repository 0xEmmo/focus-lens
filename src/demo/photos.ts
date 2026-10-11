export interface Photo {
  src: string
  alt: string
  credit: string
  licence: string
  source: string
}

export const PHOTOS: Photo[] = [
  {
    src: '/photos/braille-display.jpg',
    alt: 'Close-up of a refreshable braille display in front of a laptop, its pins raised to form a line of text',
    credit: 'Michal Klajban',
    licence: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Brno,_Universal_Learning_Design,_Braille_laptop_2_-_detail_(2).JPG',
  },
  {
    src: '/photos/canoe-third-mainland.jpg',
    alt: 'A passenger canoe beneath the Third Mainland Bridge, Lagos',
    credit: 'Kaizenify',
    licence: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:A_canoe_conveying_passenger_beneath_Third_mainland_Bridge,_Lagos.jpg',
  },
  {
    src: '/photos/agent-ada.jpg',
    alt: 'Portrait of a woman, used as the chat agent avatar',
    credit: 'Xeruz',
    licence: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Portrait_of_a_Tera_woman_2024.jpg',
  },
]
