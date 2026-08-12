import { InternalRequest, Product } from './types'

export const locations = [
  'Bungalow infini',
  'Bungalow 0',
  'Bungalow 1',
  'Bungalow 2',
  'Bungalow 3',
  'Bungalow 4',
  'Bungalow 5',
  'Bungalow 6',
  'Bungalow 7',
  'Bungalow 8',
  'Bungalow 9',
  'Bungalow 10',
  'Bungalow 11',
  'Bungalow 12',
  'Bungalow 13',
  'Bungalow 14',
  'Bungalow 15',
  'Villa 16 - Salon',
  'Villa 16 - Queen',
  'Villa 16 - King',
  'Villa 17 - Salon',
  'Villa 17 - Queen',
  'Villa 17 - King',
  'Fare Intendant',
  'Fitness',
  'Mirador',
  'Poker',
  'Reception',
  'Salle de Jeux',
  'Spa 1',
  'Spa 2',
  'Sporting',
  'VDM',
  'Extension Bar',
  'Extension Bar - Meuble à Vin',
  'Resto - Meuble 1',
  'Resto - Meuble 2',
  'Business Center',
  'Container',
]

export const demoProducts: Product[] = [
  {
    id:'p1', internalRef:'BOI-0001', supplierRef:'CC33', name:'Coca-Cola 33 cl', category:'Boissons sans alcool',
    subcategory:'Sodas', brand:'Coca-Cola', packaging:'24 x 33 cl', unit:'canette', purchasePrice:145, priceUpdatedAt:'2026-08-01',
    mainSupplier:'Fournisseur Tahiti', minStock:80, productType:'acheté',
    lots:[
      {id:'l1',lotNumber:'A-2602',expiry:'2027-02-21',location:'Container',quantity:30},
      {id:'l2',lotNumber:'B-2608',expiry:'2027-08-30',location:'Container',quantity:100},
      {id:'l3',lotNumber:'C-2609',expiry:'2027-09-07',location:'Restaurant',quantity:20}
    ]
  },
  {
    id:'p2', internalRef:'EAU-0003', supplierRef:'PER75', name:'Perrier 75 cl', category:'Eaux', subcategory:'Gazeuse',
    brand:'Perrier', packaging:'12 x 75 cl', unit:'bouteille', purchasePrice:310, priceUpdatedAt:'2026-07-22',
    mainSupplier:'Fournisseur Tahiti', minStock:48, productType:'acheté',
    lots:[{id:'l4',lotNumber:'P-774',expiry:'2027-04-30',location:'Container',quantity:72}]
  },
  {
    id:'p3', internalRef:'MAI-0001', supplierRef:'-', name:'Citronnade Mr Guy', category:'Boissons maison', subcategory:'Citronnade',
    brand:'Nukutepipi', packaging:'1 L', unit:'bouteille', purchasePrice:420, priceUpdatedAt:'2026-08-06',
    mainSupplier:'Production interne', minStock:12, productType:'fabriqué',
    lots:[{id:'l5',lotNumber:'CMG-0806',expiry:'2026-08-12',location:'Cave à jus',quantity:18}]
  }
]

export const demoRequests: InternalRequest[] = [
  { id:'REQ-0125', service:'Room Service', status:'Préparation', createdAt:'2026-08-07', items:[
    {productId:'p1',productName:'Coca-Cola 33 cl',requested:48,approved:48},
    {productId:'p2',productName:'Perrier 75 cl',requested:24,approved:24}
  ]},
  { id:'REQ-0124', service:'Audio', status:'Envoyée', createdAt:'2026-08-07', items:[
    {productId:'p1',productName:'Coca-Cola 33 cl',requested:12,approved:0}
  ]}
]

export const demoSuppliers = [
  {id:'s1',name:'Fournisseur Tahiti',contact:'contact@exemple.pf',phone:'',payment:'30 jours',notes:''},
  {id:'s2',name:'Import Boissons',contact:'commandes@exemple.pf',phone:'',payment:'À réception',notes:''},
  {id:'s3',name:'Production interne',contact:'Nukutepipi',phone:'',payment:'Interne',notes:''}
]

export const demoOrders = [
  {id:'CMD-2026-041',supplierId:'s1',supplierName:'Fournisseur Tahiti',status:'En transit' as const,bl:'BL-NUKU-8821',date:'2026-08-04',lines:[{productId:'p1',productName:'Coca-Cola 33 cl',ordered:48,received:0}]},
  {id:'CMD-2026-040',supplierId:'s2',supplierName:'Import Boissons',status:'À réceptionner' as const,bl:'BL-NUKU-8804',date:'2026-08-01',lines:[{productId:'p2',productName:'Perrier 75 cl',ordered:24,received:0}]}
]