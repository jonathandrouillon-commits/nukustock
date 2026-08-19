import { createClient } from '@supabase/supabase-js'

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local'
  )
}

const supabase = createClient(
  url,
  serviceRole,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
)

const RAS = 'R.A.S'

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanName(name) {
  return String(name || '')
    .replace(
      /\s*-\s*(Bouteille|Canette|Boite|Magnum Bouteille|Magnum|Jeroboam)\s+.*$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function matches(
  productName,
  keys
) {
  const source =
    normalize(productName)

  return keys.some(
    key =>
      source.includes(
        normalize(key)
      )
  )
}

/*
=========================================================
FICHE R.A.S
=========================================================
*/

function rasSheet() {
  return {
    description: RAS,
    aromatic_profile: RAS,
    history: RAS,
    production_method: RAS,
    anecdote: RAS,
  }
}

/*
=========================================================
RÈGLES PRODUITS / MARQUES
=========================================================
*/

const RULES = [

  /*
  =======================================================
  VODKA
  =======================================================
  */

  {
    keys: [
      'grey goose',
    ],

    sheet: {
      description:
        'Vodka française premium élaborée principalement à partir de blé tendre d’hiver français et d’eau de source. Son style recherche une texture souple, élégante et très nette.',

      aromatic_profile:
        'Céréales fines, légère douceur, notes minérales discrètes et texture soyeuse. Finale propre et douce.',

      history:
        'Grey Goose a été créée dans les années 1990 avec l’objectif de produire une vodka premium en France. François Thibault, maître de chai français, a participé à son développement.',

      production_method:
        'Blé tendre d’hiver français transformé puis fermenté et distillé. Le spiritueux est ensuite assemblé avec une eau de source avant la mise en bouteille.',

      anecdote:
        'Grey Goose revendique fortement son origine française, ce qui la différencie de nombreuses vodkas historiquement associées à la Russie ou à la Pologne.',
    },
  },

  {
    keys: [
      'ketel one',
    ],

    sheet: {
      description:
        'Vodka néerlandaise premium produite par la famille Nolet. Elle présente davantage de caractère céréaler et poivré que certaines vodkas très neutres.',

      aromatic_profile:
        'Agrumes légers, céréales, poivre blanc et finale fraîche.',

      history:
        'Ketel One est produite à Schiedam aux Pays-Bas par la famille Nolet, dont l’activité de distillation remonte au XVIIe siècle.',

      production_method:
        'Vodka de blé combinant techniques modernes de distillation et utilisation d’alambics traditionnels en cuivre pour une partie du distillat.',

      anecdote:
        'Le nom Ketel One fait référence à l’alambic historique Distilleerketel No. 1.',
    },
  },

  {
    keys: [
      'belvedere',
    ],

    sheet: {
      description:
        'Vodka polonaise premium élaborée à partir de seigle, avec une texture plus riche que les vodkas recherchant une neutralité totale.',

      aromatic_profile:
        'Seigle, poivre blanc, vanille légère et sensation crémeuse.',

      history:
        'Belvedere s’inscrit dans la tradition polonaise de production de vodka à base de seigle.',

      production_method:
        'Seigle fermenté et distillé puis assemblé avec de l’eau avant mise en bouteille.',

      anecdote:
        'Le palais du Belvédère de Varsovie apparaît sur la bouteille et a donné son nom à la marque.',
    },
  },

  {
    keys: [
      'tito s',
      'titos',
    ],

    sheet: {
      description:
        'Vodka américaine produite au Texas, connue pour être élaborée à partir de maïs.',

      aromatic_profile:
        'Profil doux, légèrement sucré, texture ronde et finale propre.',

      history:
        'Tito’s Handmade Vodka a été développée à Austin, au Texas, par Tito Beveridge.',

      production_method:
        'Vodka élaborée à partir de maïs et distillée en alambics de type pot still.',

      anecdote:
        'Tito’s est devenue l’une des vodkas américaines les plus reconnues malgré des débuts artisanaux relativement modestes.',
    },
  },

  /*
  =======================================================
  GIN
  =======================================================
  */

  {
    keys: [
      'hendricks',
      'hendrick s',
    ],

    sheet: {
      description:
        'Gin écossais premium reconnaissable à son utilisation du concombre et de la rose en complément des botaniques traditionnelles.',

      aromatic_profile:
        'Genièvre délicat, concombre frais, rose, agrumes et épices légères.',

      history:
        'Hendrick’s apparaît à la fin des années 1990 et participe fortement au renouveau international du gin premium.',

      production_method:
        'Deux types d’alambics sont utilisés pour produire des distillats différents qui sont ensuite assemblés. Des essences de concombre et de rose complètent le profil.',

      anecdote:
        'Le concombre est devenu tellement associé à Hendrick’s qu’il constitue aujourd’hui sa garniture emblématique en Gin & Tonic.',
    },
  },

  {
    keys: [
      'ki no bi',
      'kinobi',
    ],

    sheet: {
      description:
        'Gin japonais produit à Kyoto et élaboré avec plusieurs ingrédients japonais.',

      aromatic_profile:
        'Yuzu, agrumes, genièvre, thé et épices japonaises.',

      history:
        'KI NO BI fait partie des références ayant participé au développement international du gin japonais contemporain.',

      production_method:
        'Plusieurs groupes de botaniques sont distillés séparément puis assemblés afin de construire le profil final.',

      anecdote:
        'KI NO BI signifie approximativement « la beauté des saisons ».',
    },
  },

  {
    keys: [
      'barr hill',
    ],

    sheet: {
      description:
        'Gin américain du Vermont dont la particularité est l’utilisation de miel brut.',

      aromatic_profile:
        'Genièvre, fleurs, miel, plantes et texture ronde.',

      history:
        'Barr Hill est produit dans le Vermont et son identité est fortement inspirée par l’apiculture.',

      production_method:
        'Gin distillé à partir de genièvre puis complété avec du miel brut.',

      anecdote:
        'Le miel est véritablement une composante du goût, et pas seulement un élément marketing de la marque.',
    },
  },

  /*
  =======================================================
  RHUM
  =======================================================
  */

  {
    keys: [
      'bacardi carta blanca',
      'bacardi superior',
    ],

    sheet: {
      description:
        'Rhum blanc léger de tradition cubaine, conçu pour être très polyvalent en cocktail.',

      aromatic_profile:
        'Amande légère, vanille, agrumes, canne et finale relativement sèche.',

      history:
        'Bacardí a été fondée à Santiago de Cuba en 1862 par Don Facundo Bacardí Massó.',

      production_method:
        'Rhum issu de mélasse fermentée puis distillée. Les distillats sont vieillis puis filtrés afin d’obtenir un rhum clair et léger.',

      anecdote:
        'La chauve-souris présente sur le logo Bacardí est associée à la première distillerie de la famille à Cuba.',
    },
  },

  {
    keys: [
      'bacardi 4',
      'bacardi cuatro',
    ],

    sheet: {
      description:
        'Rhum Bacardí vieilli destiné à apporter davantage de rondeur et de notes boisées qu’un rhum blanc.',

      aromatic_profile:
        'Vanille, fruits, caramel léger, chêne et épices douces.',

      history:
        'Bacardí est une maison fondée à Santiago de Cuba en 1862.',

      production_method:
        'Rhum de mélasse distillé puis vieilli en fûts avant assemblage.',

      anecdote:
        'Bacardí a largement participé au développement du style de rhum léger utilisé dans de nombreux cocktails classiques.',
    },
  },

  {
    keys: [
      'havana club 3',
    ],

    sheet: {
      description:
        'Rhum cubain léger et jeune, particulièrement adapté au Mojito et au Daiquiri.',

      aromatic_profile:
        'Canne, agrumes, vanille légère, fruits et notes légèrement boisées.',

      history:
        'Havana Club est l’une des marques emblématiques de la tradition du rhum cubain.',

      production_method:
        'Mélasse fermentée puis distillée. Les rhums sont vieillis puis assemblés avant filtration.',

      anecdote:
        'Le Daiquiri et le Mojito comptent parmi les cocktails les plus emblématiques associés au rhum cubain.',
    },
  },

  {
    keys: [
      'havana club 7',
    ],

    sheet: {
      description:
        'Rhum cubain plus riche et complexe que les expressions destinées principalement aux cocktails frais.',

      aromatic_profile:
        'Vanille, cacao, fruits secs, tabac, caramel et épices.',

      history:
        'Havana Club 7 est devenu l’une des références internationales de la maison cubaine.',

      production_method:
        'Assemblage de rhums vieillis en fûts afin de développer davantage de complexité aromatique.',

      anecdote:
        'Il peut être utilisé en cocktail mais possède suffisamment de caractère pour être proposé en dégustation.',
    },
  },

  {
    keys: [
      'diplomatico reserva exclusiva',
    ],

    sheet: {
      description:
        'Rhum vénézuélien vieux au style riche et gourmand.',

      aromatic_profile:
        'Orange confite, caramel, vanille, cacao, fruits secs et épices.',

      history:
        'Diplomático Reserva Exclusiva est l’une des références les plus connues de la maison vénézuélienne.',

      production_method:
        'Assemblage de rhums provenant de plusieurs méthodes de distillation puis vieillissement en fûts.',

      anecdote:
        'Son profil doux et gourmand en fait une excellente recommandation pour un client découvrant les rhums vieux.',
    },
  },

  {
    keys: [
      'santa teresa',
    ],

    sheet: {
      description:
        'Rhum vénézuélien vieux produit par Hacienda Santa Teresa.',

      aromatic_profile:
        'Caramel, fruits secs, cacao, vanille, épices et notes boisées.',

      history:
        'Hacienda Santa Teresa a été fondée au Venezuela en 1796.',

      production_method:
        'Assemblage de rhums vieillis avec utilisation d’un système inspiré de la solera pour certaines expressions.',

      anecdote:
        'Le nombre 1796 présent sur l’une des cuvées emblématiques fait référence à l’année de fondation de l’Hacienda.',
    },
  },

  {
    keys: [
      'don q gran anejo',
      'don q gran añejo',
    ],

    sheet: {
      description:
        'Rhum portoricain vieux orienté vers la dégustation.',

      aromatic_profile:
        'Vanille, caramel, fruits secs, épices, tabac et bois.',

      history:
        'Don Q est produit à Porto Rico par la famille Serrallés.',

      production_method:
        'Rhum de mélasse distillé puis vieilli en fûts avant assemblage.',

      anecdote:
        'Le nom Don Q est une référence à Don Quichotte.',
    },
  },

  {
    keys: [
      'clement xo',
      'clément xo',
    ],

    sheet: {
      description:
        'Rhum agricole vieux de Martinique élaboré à partir de jus frais de canne.',

      aromatic_profile:
        'Canne, fruits secs, cacao, orange, épices, vanille et bois.',

      history:
        'La maison Clément fait partie des maisons historiques du rhum agricole martiniquais.',

      production_method:
        'Jus frais de canne fermenté puis distillé. Les rhums sont ensuite vieillis longuement en fûts avant assemblage.',

      anecdote:
        'Contrairement à la majorité des rhums internationaux fabriqués avec de la mélasse, le rhum agricole part directement du jus frais de canne.',
    },
  },

  {
    keys: [
      'manao',
      'mana o',
    ],

    sheet: {
      description:
        'Rhum polynésien de pur jus de canne mettant en avant une matière première locale.',

      aromatic_profile:
        'Canne fraîche, notes végétales, fleurs, agrumes et poivre.',

      history:
        'Mana’o participe au développement d’une véritable identité du rhum polynésien.',

      production_method:
        'Jus frais de canne fermenté puis distillé.',

      anecdote:
        'Pour l’upselling, son origine polynésienne est un argument particulièrement intéressant auprès des visiteurs internationaux.',
    },
  },

  /*
  =======================================================
  TEQUILA / MEZCAL
  =======================================================
  */

  {
    keys: [
      'roca patron silver',
    ],

    sheet: {
      description:
        'Tequila Silver premium mettant fortement en avant les méthodes traditionnelles de production de l’agave.',

      aromatic_profile:
        'Agave cuit, agrumes, poivre, végétal et minéralité.',

      history:
        'Roca Patrón a été développée pour mettre particulièrement en valeur la méthode traditionnelle de la tahona.',

      production_method:
        'Agaves bleus Weber cuits puis écrasés à l’aide d’une lourde roue de pierre appelée tahona. Le jus est ensuite fermenté puis distillé.',

      anecdote:
        'La tahona utilisée pour broyer les agaves constitue un excellent élément de storytelling face au client.',
    },
  },

  {
    keys: [
      'roca patron reposado',
      'patron reposado',
      'patrón reposado',
    ],

    sheet: {
      description:
        'Tequila Reposado premium combinant fraîcheur de l’agave et notes apportées par le passage en bois.',

      aromatic_profile:
        'Agave cuit, agrumes, miel léger, vanille, poivre et chêne.',

      history:
        'Patrón fait partie des marques ayant fortement développé l’image internationale de la tequila premium.',

      production_method:
        'Agave bleu Weber cuit, broyé, fermenté puis distillé. La tequila repose ensuite en fûts avant assemblage.',

      anecdote:
        'Reposado signifie « reposée » : cette catégorie constitue souvent un excellent compromis entre le caractère végétal d’une Blanco et le boisé d’une Añejo.',
    },
  },

  {
    keys: [
      'patron anejo',
      'patrón añejo',
    ],

    sheet: {
      description:
        'Tequila Añejo premium vieillie en bois, destinée autant à la dégustation qu’aux cocktails haut de gamme.',

      aromatic_profile:
        'Agave cuit, caramel, vanille, chêne, fruits secs et poivre.',

      history:
        'Patrón est devenue l’une des marques emblématiques de la tequila premium internationale.',

      production_method:
        'Agave bleu Weber cuit, broyé, fermenté et distillé puis vieilli en fûts.',

      anecdote:
        'Une Añejo permet facilement un upselling auprès d’un amateur de whisky ou de cognac recherchant des notes boisées.',
    },
  },

  {
    keys: [
      'don julio 1942',
      '1942 don julio',
    ],

    sheet: {
      description:
        'Tequila Añejo haut de gamme reconnue pour son profil riche et particulièrement doux.',

      aromatic_profile:
        'Agave cuit, vanille, caramel, fruits mûrs, épices et bois.',

      history:
        'Le nom Don Julio 1942 rend hommage à l’année où Don Julio Estrada a commencé à produire de la tequila.',

      production_method:
        'Tequila élaborée à partir d’agave bleu puis vieillie en fûts afin de développer rondeur et complexité.',

      anecdote:
        '1942 ne correspond pas à l’âge de la tequila : c’est une référence à l’année de début de l’activité de Don Julio Estrada.',
    },
  },

  {
    keys: [
      'del maguey',
    ],

    sheet: {
      description:
        'Mezcal artisanal mexicain mettant en avant le producteur, le village et l’agave selon la cuvée.',

      aromatic_profile:
        'Agave rôti, fumée, plantes, terre, agrumes et minéralité.',

      history:
        'Del Maguey a joué un rôle important dans la diffusion internationale des mezcals artisanaux de villages.',

      production_method:
        'Selon les cuvées : agaves cuits traditionnellement, souvent en fosse, puis broyés, fermentés et distillés artisanalement.',

      anecdote:
        'Le mezcal n’est pas simplement une tequila fumée : il existe une très grande diversité d’agaves et de méthodes de production.',
    },
  },

  /*
  =======================================================
  WHISKY
  =======================================================
  */

  {
    keys: [
      'lagavulin 16',
    ],

    sheet: {
      description:
        'Single malt d’Islay âgé de 16 ans, connu pour son intensité tourbée et maritime.',

      aromatic_profile:
        'Tourbe, fumée, iode, fruits secs, épices, bois et longue finale maritime.',

      history:
        'Lagavulin est une distillerie historique située sur la côte sud de l’île d’Islay en Écosse.',

      production_method:
        'Whisky produit uniquement à partir d’orge maltée dans une seule distillerie puis vieilli au minimum seize ans pour cette expression.',

      anecdote:
        'Islay est célèbre dans le monde entier pour ses whiskies tourbés : c’est un argument simple et efficace pour guider un client amateur de goûts fumés.',
    },
  },

  {
    keys: [
      'glenmorangie original',
    ],

    sheet: {
      description:
        'Single malt des Highlands réputé pour son style élégant, fruité et accessible.',

      aromatic_profile:
        'Agrumes, pêche, fleurs, miel, vanille et épices douces.',

      history:
        'Glenmorangie est une distillerie historique des Highlands écossais.',

      production_method:
        'Single malt distillé dans de très hauts alambics en cuivre puis vieilli en fûts.',

      anecdote:
        'Glenmorangie est connue pour utiliser des alambics particulièrement hauts, souvent mis en avant pour expliquer la finesse de son distillat.',
    },
  },

  {
    keys: [
      'nikka from the barrel',
    ],

    sheet: {
      description:
        'Whisky japonais d’assemblage au style riche, concentré et puissant.',

      aromatic_profile:
        'Orange, fruits mûrs, caramel, épices, bois et finale chaleureuse.',

      history:
        'Nikka a été fondée par Masataka Taketsuru, personnage central de l’histoire du whisky japonais.',

      production_method:
        'Assemblage de whiskies de malt et de grain puis période de mariage avant embouteillage.',

      anecdote:
        'Sa petite bouteille carrée est devenue immédiatement identifiable et fait partie de l’identité du produit.',
    },
  },

  {
    keys: [
      'buffalo trace',
    ],

    sheet: {
      description:
        'Bourbon du Kentucky équilibré, gourmand et très polyvalent.',

      aromatic_profile:
        'Vanille, caramel, maïs doux, fruits mûrs, chêne et épices.',

      history:
        'Buffalo Trace est produit à Frankfort dans le Kentucky sur un site historique de production de whiskey.',

      production_method:
        'Whiskey contenant au minimum 51 % de maïs puis vieilli en fûts de chêne neufs carbonisés.',

      anecdote:
        'Un bourbon n’est pas obligatoirement produit au Kentucky : il doit être fabriqué aux États-Unis et respecter les règles de la catégorie.',
    },
  },

  {
    keys: [
      'woodford reserve rye',
      'woodford reserve aged cask rye',
      'woodford reserve new cask rye',
    ],

    sheet: {
      description:
        'Rye whiskey américain mettant davantage l’accent sur le caractère épicé du seigle.',

      aromatic_profile:
        'Poivre, épices, céréales, fruits, miel, vanille et notes boisées.',

      history:
        'Woodford Reserve est produit dans le Kentucky et la gamme comprend différentes expressions de whiskey américain.',

      production_method:
        'Whiskey élaboré avec une proportion importante de seigle, fermenté, distillé puis vieilli en fûts.',

      anecdote:
        'Un Rye constitue une excellente recommandation pour un client qui trouve le bourbon trop doux et recherche davantage d’épices.',
    },
  },

  {
    keys: [
      'jack daniels',
      'jack daniel s',
    ],

    sheet: {
      description:
        'Tennessee whiskey américain connu pour son style souple et légèrement gourmand.',

      aromatic_profile:
        'Vanille, caramel, banane, céréales, bois et épices douces.',

      history:
        'Jack Daniel’s est produit à Lynchburg dans le Tennessee.',

      production_method:
        'Le whiskey est filtré sur une couche de charbon de bois d’érable avant son vieillissement en fûts neufs carbonisés.',

      anecdote:
        'Cette filtration sur charbon est connue comme le Lincoln County Process et constitue une différence importante entre Tennessee Whiskey et bourbon classique.',
    },
  },

  /*
  =======================================================
  LIQUEURS / APÉRITIFS
  =======================================================
  */

  {
    keys: [
      'cointreau',
    ],

    sheet: {
      description:
        'Liqueur française d’orange reconnue pour son équilibre entre puissance aromatique, alcool et sucre.',

      aromatic_profile:
        'Orange fraîche, zestes d’agrumes, fleurs blanches et légère note épicée.',

      history:
        'Cointreau est née à Angers au XIXe siècle et est devenue une référence internationale de la liqueur d’orange.',

      production_method:
        'Écorces d’oranges douces et amères distillées puis assemblées avec les autres composants de la liqueur.',

      anecdote:
        'Margarita, Sidecar et Cosmopolitan sont trois grands classiques dans lesquels Cointreau peut être utilisé.',
    },
  },

  {
    keys: [
      'grand marnier',
    ],

    sheet: {
      description:
        'Liqueur française d’orange dont la base de cognac apporte davantage de rondeur et de profondeur qu’un triple sec classique.',

      aromatic_profile:
        'Orange confite, zeste, vanille, caramel, épices et notes boisées.',

      history:
        'Grand Marnier est une liqueur française historique apparue au XIXe siècle.',

      production_method:
        'Essence d’orange amère assemblée avec du cognac puis maturation.',

      anecdote:
        'La présence de cognac constitue un excellent argument d’upselling par rapport à une liqueur d’orange plus simple.',
    },
  },

  {
    keys: [
      'kahlua',
      'kahlúa',
    ],

    sheet: {
      description:
        'Liqueur mexicaine de café particulièrement utilisée dans les cocktails gourmands.',

      aromatic_profile:
        'Café torréfié, vanille, cacao, caramel et douceur marquée.',

      history:
        'Kahlúa est originaire du Mexique et est devenue l’une des références internationales de la liqueur de café.',

      production_method:
        'Liqueur élaborée autour de café, de sucre et d’une base alcoolisée.',

      anecdote:
        'White Russian, Black Russian et de nombreux Espresso Martini utilisent une liqueur de café comme Kahlúa.',
    },
  },

  {
    keys: [
      'baileys',
      'bailey',
    ],

    sheet: {
      description:
        'Liqueur irlandaise à base de crème et de spiritueux irlandais.',

      aromatic_profile:
        'Crème, cacao, caramel, vanille et whiskey doux.',

      history:
        'Baileys Original Irish Cream est apparu dans les années 1970 et a largement développé la catégorie des cream liqueurs.',

      production_method:
        'Crème laitière assemblée avec alcool ou whiskey irlandais, sucre et arômes.',

      anecdote:
        'L’acidité peut faire cailler les liqueurs à base de crème, ce qui explique l’importance de la construction de certains cocktails.',
    },
  },

  {
    keys: [
      'campari',
    ],

    sheet: {
      description:
        'Amer italien emblématique de la culture de l’aperitivo.',

      aromatic_profile:
        'Orange amère, plantes, racines, épices et longue amertume.',

      history:
        'Campari est apparu en Italie au XIXe siècle et est aujourd’hui associé à de nombreux classiques.',

      production_method:
        'La recette précise est confidentielle. Le produit repose sur l’extraction et l’assemblage de différents ingrédients aromatiques.',

      anecdote:
        'Negroni, Americano et Boulevardier permettent très facilement de raconter l’histoire de Campari au client.',
    },
  },

  {
    keys: [
      'st germain',
      'saint germain',
    ],

    sheet: {
      description:
        'Liqueur florale élaborée à partir de fleurs de sureau.',

      aromatic_profile:
        'Fleur de sureau, poire, fruits blancs, agrumes et notes miellées.',

      history:
        'St-Germain a fortement participé au retour des saveurs de fleur de sureau dans le cocktail moderne.',

      production_method:
        'Liqueur obtenue à partir de fleurs de sureau et d’une base alcoolisée sucrée.',

      anecdote:
        'Quelques millilitres suffisent généralement pour donner au cocktail une signature florale très identifiable.',
    },
  },

  {
    keys: [
      'fernet branca',
    ],

    sheet: {
      description:
        'Fernet italien intense, très amer et particulièrement herbacé.',

      aromatic_profile:
        'Menthe, racines, réglisse, plantes médicinales et épices.',

      history:
        'Fernet-Branca est une référence historique des amari italiens.',

      production_method:
        'Assemblage et macération de nombreuses plantes, racines et épices puis maturation.',

      anecdote:
        'Le Fernet-Cola est devenu extrêmement populaire en Argentine.',
    },
  },

  /*
  =======================================================
  CHAMPAGNE
  =======================================================
  */

  {
    keys: [
      'veuve clicquot grande dame',
      'grande dame',
    ],

    sheet: {
      description:
        'Cuvée prestige de Veuve Clicquot créée en hommage à Madame Clicquot.',

      aromatic_profile:
        'Agrumes, fruits blancs, brioche, fleurs, noisette et épices selon le millésime.',

      history:
        'La Grande Dame rend directement hommage à Barbe-Nicole Clicquot, figure majeure de l’histoire de la maison.',

      production_method:
        'Champagne élaboré selon la méthode traditionnelle avec seconde fermentation en bouteille et long vieillissement sur lies.',

      anecdote:
        'Le nom La Grande Dame est une référence directe à Madame Clicquot, ce qui constitue un excellent storytelling au service.',
    },
  },

  {
    keys: [
      'veuve clicquot brut',
    ],

    sheet: {
      description:
        'Champagne Brut de maison connu pour son style structuré, fruité et vineux.',

      aromatic_profile:
        'Pomme, agrumes, fruits jaunes, brioche et notes toastées.',

      history:
        'Veuve Clicquot est historiquement liée à Madame Clicquot, entrepreneuse majeure du Champagne au XIXe siècle.',

      production_method:
        'Méthode traditionnelle : seconde fermentation en bouteille, élevage sur lies, remuage, dégorgement puis dosage.',

      anecdote:
        'Madame Clicquot est historiquement associée au développement de la technique du remuage permettant de clarifier le Champagne.',
    },
  },

  /*
  =======================================================
  BIÈRE
  =======================================================
  */

  {
    keys: [
      'hinano ambree',
      'hinano ambrée',
    ],

    sheet: {
      description:
        'Bière tahitienne ambrée offrant davantage de notes maltées que la version lager classique.',

      aromatic_profile:
        'Malt toasté, caramel léger, céréales et amertume modérée.',

      history:
        'Hinano est l’une des marques les plus emblématiques de Tahiti et de la Polynésie française.',

      production_method:
        'Brassage de malt, eau et houblon puis fermentation et maturation.',

      anecdote:
        'Pour un visiteur international, l’origine tahitienne de Hinano constitue en elle-même un argument de découverte locale.',
    },
  },

  {
    keys: [
      'hinano',
    ],

    sheet: {
      description:
        'Bière emblématique de Tahiti, légère et rafraîchissante.',

      aromatic_profile:
        'Malt léger, céréales, fraîcheur et amertume modérée.',

      history:
        'Hinano est fortement associée à l’identité de Tahiti et de la Polynésie française.',

      production_method:
        'Bière brassée à partir d’eau, céréales maltées et houblon puis fermentée.',

      anecdote:
        'Proposer Hinano à un visiteur constitue une manière simple de mettre en avant un produit fortement associé à Tahiti.',
    },
  },

  /*
  =======================================================
  VINS
  =======================================================
  */

  {
    keys: [
      'chablis',
    ],

    sheet: {
      description:
        'Vin blanc de Bourgogne élaboré exclusivement à partir de Chardonnay.',

      aromatic_profile:
        'Agrumes, pomme, fruits blancs, fleurs et notes minérales.',

      history:
        'Chablis se trouve dans le nord de la Bourgogne et est mondialement réputé pour son Chardonnay au style tendu et minéral.',

      production_method:
        'Vinification du Chardonnay. Cuves, fûts ou combinaison des deux sont utilisés selon le domaine et la cuvée.',

      anecdote:
        'Un client peut être surpris d’apprendre que Chablis est toujours du Chardonnay, tant son style peut être différent d’un Chardonnay boisé et riche.',
    },
  },

  {
    keys: [
      'chassagne montrachet',
      'chassagne-montrachet',
    ],

    sheet: {
      description:
        'Vin de Bourgogne provenant d’une appellation prestigieuse de la Côte de Beaune.',

      aromatic_profile:
        'Pour les blancs : agrumes, fruits blancs, fleurs, noisette, beurre frais et minéralité selon le domaine.',

      history:
        'Chassagne-Montrachet fait partie des grands villages viticoles de la Côte de Beaune.',

      production_method:
        'Pour les blancs, Chardonnay vinifié puis généralement élevé en fûts selon les choix du domaine.',

      anecdote:
        'Chassagne-Montrachet produit également du vin rouge à base de Pinot Noir.',
    },
  },

  {
    keys: [
      'gevrey chambertin',
      'gevrey-chambertin',
    ],

    sheet: {
      description:
        'Vin rouge de Bourgogne provenant de la Côte de Nuits et élaboré à partir de Pinot Noir.',

      aromatic_profile:
        'Cerise, framboise, fruits noirs, épices et sous-bois selon l’âge.',

      history:
        'Gevrey-Chambertin est l’un des villages les plus prestigieux de la Côte de Nuits.',

      production_method:
        'Vinification du Pinot Noir puis élevage, souvent en fûts, selon le domaine.',

      anecdote:
        'Gevrey-Chambertin est souvent présenté comme un Pinot Noir bourguignon au caractère relativement puissant et structuré.',
    },
  },

  {
    keys: [
      'pommard',
    ],

    sheet: {
      description:
        'Vin rouge de Bourgogne provenant de la Côte de Beaune et élaboré à partir de Pinot Noir.',

      aromatic_profile:
        'Cerise noire, mûre, épices, terre et sous-bois.',

      history:
        'Pommard est l’une des appellations rouges historiques de la Côte de Beaune.',

      production_method:
        'Vinification du Pinot Noir puis élevage selon les choix du domaine.',

      anecdote:
        'Pommard est souvent une bonne recommandation pour un client qui souhaite un Pinot Noir bourguignon avec davantage de structure.',
    },
  },

  {
    keys: [
      'cote rotie',
      'côte rôtie',
      'côte-rôtie',
    ],

    sheet: {
      description:
        'Grand vin rouge du Rhône septentrional dominé par la Syrah.',

      aromatic_profile:
        'Mûre, cassis, violette, poivre noir, olive, fumée et épices.',

      history:
        'Côte-Rôtie est une appellation historique du Rhône septentrional, célèbre pour ses coteaux très pentus.',

      production_method:
        'Vinification principalement de Syrah. Une petite proportion de Viognier peut être utilisée selon les règles et choix du producteur.',

      anecdote:
        'Côte-Rôtie signifie littéralement « côte rôtie », en référence à l’exposition des coteaux.',
    },
  },

  {
    keys: [
      'barolo',
    ],

    sheet: {
      description:
        'Grand vin rouge du Piémont italien élaboré à partir du cépage Nebbiolo.',

      aromatic_profile:
        'Rose, cerise, fruits rouges, réglisse, épices et sous-bois.',

      history:
        'Barolo est l’une des appellations les plus prestigieuses du Piémont et d’Italie.',

      production_method:
        'Vinification du Nebbiolo puis vieillissement réglementé avant commercialisation.',

      anecdote:
        'Le Nebbiolo peut présenter une couleur relativement claire tout en développant beaucoup de tanins et de puissance.',
    },
  },

  {
    keys: [
      'solaia',
    ],

    sheet: {
      description:
        'Grand vin rouge toscan produit par Antinori.',

      aromatic_profile:
        'Cassis, cerise noire, cacao, tabac, épices et notes boisées.',

      history:
        'Solaia fait partie des grandes cuvées modernes ayant contribué au prestige international des vins toscans.',

      production_method:
        'Assemblage de cépages rouges vinifiés séparément puis élevés en barriques avant assemblage final.',

      anecdote:
        'Solaia est l’un des vins emblématiques de la famille Antinori.',
    },
  },

  {
    keys: [
      'ornellaia',
      'serre nuove',
    ],

    sheet: {
      description:
        'Vin rouge de Bolgheri en Toscane élaboré avec des cépages inspirés des grands assemblages bordelais.',

      aromatic_profile:
        'Cassis, mûre, prune, tabac, épices et herbes méditerranéennes.',

      history:
        'Bolgheri est devenue l’une des régions les plus prestigieuses du vin italien moderne.',

      production_method:
        'Vinification de plusieurs cépages puis élevage en barriques et assemblage.',

      anecdote:
        'Bolgheri est connue pour avoir bâti sa réputation avec des cépages comme Cabernet Sauvignon, Merlot et Cabernet Franc.',
    },
  },

]

/*
=========================================================
RECHERCHE D'UNE FICHE
=========================================================
*/

function getSheet(product) {
  for (
    const rule
    of RULES
  ) {
    if (
      matches(
        product.name,
        rule.keys
      )
    ) {
      return {
        ...rule.sheet,
        precise: true,
      }
    }
  }

  return {
    ...rasSheet(),
    precise: false,
  }
}

/*
=========================================================
CHARGEMENT DES PRODUITS
=========================================================
*/

console.log('')
console.log(
  '========================================'
)
console.log(
  'FICHES PRODUITS BAR TEAM — V2 UPSELLING'
)
console.log(
  '========================================'
)
console.log('')

const {
  data: products,
  error:
    productsError,
} =
  await supabase
    .from('products')
    .select(
      `
      id,
      internal_reference,
      name,
      category,
      subcategory,
      brand,
      active
      `
    )
    .eq(
      'active',
      true
    )
    .order(
      'name'
    )

if (productsError) {
  throw productsError
}

console.log(
  `Produits actifs trouvés : ${
    products?.length ||
    0
  }`
)

console.log('')

/*
=========================================================
MISE À JOUR
=========================================================
*/

let updated = 0
let precise = 0
let ras = 0
let errors = 0

for (
  const product
  of products || []
) {

  const sheet =
    getSheet(
      product
    )

  const payload = {
    product_id:
      product.id,

    description:
      sheet.description ||
      RAS,

    aromatic_profile:
      sheet.aromatic_profile ||
      RAS,

    history:
      sheet.history ||
      RAS,

    production_method:
      sheet.production_method ||
      RAS,

    anecdote:
      sheet.anecdote ||
      RAS,

    /*
     * Ancien champ retiré de l'affichage.
     */
    service_notes:
      '',

    updated_at:
      new Date()
        .toISOString(),
  }

  const {
    error,
  } =
    await supabase
      .from(
        'bar_product_sheets'
      )
      .upsert(
        payload,
        {
          onConflict:
            'product_id',
        }
      )

  if (error) {
    errors += 1

    console.error(
      `ERREUR : ${product.name}`
    )

    console.error(
      error.message
    )

    continue
  }

  updated += 1

  if (
    sheet.precise
  ) {
    precise += 1

    console.log(
      `✓ INFO : ${product.name}`
    )
  } else {
    ras += 1

    console.log(
      `• R.A.S : ${product.name}`
    )
  }
}

/*
=========================================================
RÉSULTAT
=========================================================
*/

console.log('')
console.log(
  '========================================'
)
console.log(
  'ENRICHISSEMENT TERMINÉ'
)
console.log(
  '========================================'
)

console.log(
  `Produits actifs : ${
    products?.length ||
    0
  }`
)

console.log(
  `Fiches mises à jour : ${updated}`
)

console.log(
  `Fiches enrichies : ${precise}`
)

console.log(
  `Fiches R.A.S : ${ras}`
)

console.log(
  `Erreurs : ${errors}`
)

console.log(
  '========================================'
)

console.log('')

if (
  errors === 0
) {
  console.log(
    'SUCCÈS — Toutes les fiches produits ont été traitées.'
  )
}