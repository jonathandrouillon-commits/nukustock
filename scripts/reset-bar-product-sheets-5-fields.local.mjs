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

const admin = createClient(
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

function exactSheet(product) {
  const name =
    cleanName(product.name)

  const n =
    normalize(name)

  const rules = [
    {
      keys: [
        'grey goose',
      ],
      value: {
        description:
          'Vodka française premium élaborée à partir de blé tendre d’hiver de Picardie et d’eau de source naturelle.',

        aromatic_profile:
          'Profil doux et net, texture soyeuse, notes céréalières fines et légère fraîcheur.',

        history:
          'Grey Goose a été créée en 1997 par Sidney Frank avec le maître distillateur François Thibault.',

        production_method:
          'Blé tendre d’hiver français moulu, transformé, fermenté puis distillé avant assemblage avec de l’eau de source.',

        anecdote:
          'Grey Goose met en avant une production française utilisant notamment du blé tendre d’hiver et de l’eau de source.',
      },
    },

    {
      keys: [
        'ketel one',
      ],
      value: {
        description:
          'Vodka néerlandaise premium de la famille Nolet, connue pour son profil net et légèrement poivré.',

        aromatic_profile:
          'Agrumes fins, céréales, poivre blanc et finale propre.',

        history:
          'Ketel One est produite par la famille Nolet à Schiedam, aux Pays-Bas, une famille de distillateurs active depuis le XVIIe siècle.',

        production_method:
          'Vodka de blé combinant distillation moderne et utilisation d’alambics en cuivre pour une partie de la production.',

        anecdote:
          'Le nom Ketel One fait référence à l’alambic historique Distilleerketel No. 1 de la famille Nolet.',
      },
    },

    {
      keys: [
        'belvedere',
      ],
      value: {
        description:
          'Vodka polonaise premium élaborée à partir de seigle.',

        aromatic_profile:
          'Seigle, poivre blanc, vanille légère et texture crémeuse.',

        history:
          'Belvedere est une vodka polonaise produite dans la tradition des vodkas de seigle.',

        production_method:
          'Distillation de seigle puis assemblage avec de l’eau avant mise en bouteille.',

        anecdote:
          'Son nom fait référence au palais du Belvédère de Varsovie, représenté sur la bouteille.',
      },
    },

    {
      keys: [
        'hendricks',
        'hendrick s',
      ],
      value: {
        description:
          'Gin écossais premium reconnu pour l’association du genièvre, du concombre et de la rose.',

        aromatic_profile:
          'Genièvre délicat, concombre frais, rose, agrumes et épices douces.',

        history:
          'Hendrick’s est apparu à la fin des années 1990 et a participé au renouveau mondial du gin premium.',

        production_method:
          'Distillation utilisant deux types d’alambics, puis assemblage et ajout d’essences de concombre et de rose.',

        anecdote:
          'Le service avec une tranche de concombre est devenu une signature emblématique de Hendrick’s.',
      },
    },

    {
      keys: [
        'ki no bi',
        'kinobi',
      ],
      value: {
        description:
          'Gin japonais produit à Kyoto et construit autour de botaniques japonaises.',

        aromatic_profile:
          'Yuzu, genièvre, agrumes, thé et épices japonaises.',

        history:
          'KI NO BI est produit à Kyoto et fait partie des références du gin japonais contemporain.',

        production_method:
          'Différents groupes de botaniques sont distillés séparément puis assemblés.',

        anecdote:
          'KI NO BI signifie « la beauté des saisons ».',
      },
    },

    {
      keys: [
        'barr hill',
      ],
      value: {
        description:
          'Gin américain du Vermont associant genièvre et miel brut.',

        aromatic_profile:
          'Genièvre, fleurs, miel, herbes et texture ronde.',

        history:
          'Barr Hill est produit dans le Vermont avec une identité fortement liée à l’apiculture.',

        production_method:
          'Gin distillé autour du genièvre puis fini avec du miel brut.',

        anecdote:
          'Le miel est une véritable signature aromatique du gin Barr Hill.',
      },
    },

    {
      keys: [
        'bacardi',
      ],
      value: {
        description:
          'Rhum de tradition cubaine produit par la maison Bacardí.',

        aromatic_profile:
          'Canne, vanille, fruits, agrumes et notes boisées variables selon la référence.',

        history:
          'Bacardí a été fondée à Santiago de Cuba en 1862 par Don Facundo Bacardí Massó.',

        production_method:
          'Rhum élaboré à partir de mélasse fermentée puis distillée. Le vieillissement et la filtration varient selon la référence.',

        anecdote:
          'Bacardí est historiquement associé à plusieurs grands cocktails cubains, notamment le Daiquiri et le Cuba Libre.',
      },
    },

    {
      keys: [
        'havana club',
      ],
      value: {
        description:
          'Rhum cubain de tradition espagnole, étroitement associé aux grands cocktails de La Havane.',

        aromatic_profile:
          'Canne, vanille légère, fruits, agrumes et notes boisées variables selon l’âge.',

        history:
          'Havana Club est une marque historique du rhum cubain.',

        production_method:
          'Mélasse fermentée et distillée, puis vieillissement et assemblage selon l’expression.',

        anecdote:
          'Mojito, Daiquiri et Cuba Libre sont trois cocktails emblématiques du rhum cubain.',
      },
    },

    {
      keys: [
        'diplomatico',
      ],
      value: {
        description:
          'Rhum vénézuélien connu pour son style riche et rond.',

        aromatic_profile:
          'Caramel, orange confite, vanille, cacao, fruits secs et épices.',

        history:
          'Diplomático est produit au Venezuela et fait partie des marques de rhum vénézuélien les plus connues internationalement.',

        production_method:
          'Assemblage de rhums issus de différents procédés de distillation puis vieillissement en fûts selon la référence.',

        anecdote:
          'Son profil généralement rond et gourmand en fait une référence populaire pour la dégustation.',
      },
    },

    {
      keys: [
        'clement xo',
        'clément xo',
      ],
      value: {
        description:
          'Rhum agricole vieux de Martinique élaboré à partir de pur jus de canne.',

        aromatic_profile:
          'Canne, fruits secs, épices, cacao, orange, vanille et bois.',

        history:
          'La maison Clément fait partie des noms historiques du rhum agricole martiniquais.',

        production_method:
          'Jus frais de canne fermenté, distillé puis vieilli longuement en fûts avant assemblage.',

        anecdote:
          'Le rhum agricole utilise directement le jus frais de canne contrairement aux rhums élaborés à partir de mélasse.',
      },
    },

    {
      keys: [
        'manao',
        'mana o',
      ],
      value: {
        description:
          'Rhum polynésien de pur jus de canne mettant en avant la canne locale.',

        aromatic_profile:
          'Canne fraîche, notes végétales, agrumes, fleurs et poivre.',

        history:
          'Mana’o participe au développement du rhum de pur jus de canne en Polynésie française.',

        production_method:
          'Jus frais de canne fermenté puis distillé.',

        anecdote:
          'Mana’o possède une identité directement liée au terroir polynésien.',
      },
    },

    {
      keys: [
        'patron anejo',
        'patrón añejo',
      ],
      value: {
        description:
          'Tequila Añejo premium élaborée à partir d’agave bleu Weber puis vieillie en fûts.',

        aromatic_profile:
          'Agave cuit, vanille, caramel, chêne, poivre et fruits secs.',

        history:
          'Patrón a été fondée en 1989 et a participé à l’essor international de la tequila premium.',

        production_method:
          'Agaves bleus Weber cuits, broyés, fermentés et distillés puis vieillis en fûts.',

        anecdote:
          'Patrón utilise notamment une tahona en pierre pour une partie de sa production.',
      },
    },

    {
      keys: [
        'patron reposado',
        'patrón reposado',
        'roca patron reposado',
      ],
      value: {
        description:
          'Tequila Reposado premium élaborée à partir d’agave bleu Weber et reposée en fûts.',

        aromatic_profile:
          'Agave cuit, agrumes, vanille, miel léger, poivre et chêne.',

        history:
          'Patrón a été fondée en 1989 et a contribué au développement du segment premium de la tequila.',

        production_method:
          'Agaves bleus Weber cuits, broyés, fermentés et distillés puis reposés en fûts.',

        anecdote:
          'Reposado signifie « reposée » et désigne une tequila ayant passé une période réglementée en contenant de bois.',
      },
    },

    {
      keys: [
        'roca patron silver',
      ],
      value: {
        description:
          'Tequila Silver premium centrée sur l’expression de l’agave bleu Weber.',

        aromatic_profile:
          'Agave cuit, agrumes, poivre, herbes et minéralité.',

        history:
          'Roca Patrón a été conçue pour mettre particulièrement en avant le broyage traditionnel à la tahona.',

        production_method:
          'Agaves cuits, broyés à la tahona, fermentés puis distillés.',

        anecdote:
          'Une tahona est une lourde roue de pierre traditionnellement utilisée pour écraser l’agave cuit.',
      },
    },

    {
      keys: [
        'del maguey',
      ],
      value: {
        description:
          'Mezcal mexicain artisanal dont le caractère dépend de la cuvée et du village de production.',

        aromatic_profile:
          'Agave rôti, fumée, herbes, agrumes, terre et minéralité.',

        history:
          'Del Maguey a contribué à faire connaître internationalement les mezcals artisanaux de villages.',

        production_method:
          'Agaves cuits traditionnellement, puis broyés, fermentés et distillés. La méthode précise dépend de la cuvée.',

        anecdote:
          'Le mezcal couvre une grande diversité d’agaves, de villages et de méthodes de production.',
      },
    },

    {
      keys: [
        'don q',
      ],
      value: {
        description:
          'Rhum portoricain produit par la famille Serrallés.',

        aromatic_profile:
          'Vanille, caramel, fruits, épices et notes boisées variables selon l’expression.',

        history:
          'Don Q est une maison historique de Porto Rico liée à la famille Serrallés.',

        production_method:
          'Rhum de mélasse distillé, puis éventuellement vieilli et assemblé selon la référence.',

        anecdote:
          'Le nom Don Q fait référence à Don Quichotte.',
      },
    },

    {
      keys: [
        'lagavulin 16',
      ],
      value: {
        description:
          'Single malt Scotch whisky d’Islay âgé de 16 ans, connu pour son caractère tourbé et maritime.',

        aromatic_profile:
          'Tourbe, fumée, iode, fruits secs, bois, épices et longue finale maritime.',

        history:
          'Lagavulin est une distillerie historique de la côte sud de l’île d’Islay en Écosse.',

        production_method:
          'Whisky de malt distillé en alambics puis vieilli au minimum 16 ans pour cette expression.',

        anecdote:
          'Islay est particulièrement célèbre pour ses whiskies tourbés et maritimes.',
      },
    },

    {
      keys: [
        'glenmorangie',
      ],
      value: {
        description:
          'Single malt Scotch whisky des Highlands au style généralement floral et fruité.',

        aromatic_profile:
          'Agrumes, fruits, fleurs, vanille, miel et épices légères.',

        history:
          'Glenmorangie est une distillerie des Highlands écossais.',

        production_method:
          'Single malt distillé dans de hauts alambics en cuivre puis élevé en fûts.',

        anecdote:
          'Glenmorangie est particulièrement connue pour la grande hauteur de ses alambics.',
      },
    },

    {
      keys: [
        'nikka from the barrel',
      ],
      value: {
        description:
          'Whisky japonais d’assemblage au caractère intense et concentré.',

        aromatic_profile:
          'Fruits mûrs, épices, caramel, orange, bois et finale chaleureuse.',

        history:
          'Nikka a été fondée par Masataka Taketsuru, figure majeure de l’histoire du whisky japonais.',

        production_method:
          'Assemblage de whiskies de malt et de grain puis mariage avant embouteillage.',

        anecdote:
          'Sa petite bouteille carrée est devenue l’une de ses signatures visuelles.',
      },
    },

    {
      keys: [
        'buffalo trace',
      ],
      value: {
        description:
          'Bourbon américain du Kentucky au style équilibré et gourmand.',

        aromatic_profile:
          'Vanille, caramel, céréales, épices, chêne et fruits mûrs.',

        history:
          'Buffalo Trace est produit à Frankfort dans le Kentucky, sur un site historique de production de whiskey.',

        production_method:
          'Whiskey contenant une majorité de maïs, distillé puis vieilli en fûts de chêne neufs carbonisés.',

        anecdote:
          'Pour être appelé bourbon, un whiskey américain doit notamment contenir au moins 51 % de maïs.',
      },
    },

    {
      keys: [
        'jack daniels',
        'jack daniel s',
      ],
      value: {
        description:
          'Tennessee whiskey américain connu pour son profil souple, vanillé et boisé.',

        aromatic_profile:
          'Caramel, vanille, banane, céréales, chêne et épices douces.',

        history:
          'Jack Daniel’s est produit à Lynchburg dans le Tennessee.',

        production_method:
          'Whiskey filtré sur charbon de bois d’érable avant vieillissement en fûts de chêne neufs carbonisés.',

        anecdote:
          'Cette filtration sur charbon est associée au Lincoln County Process.',
      },
    },

    {
      keys: [
        'cointreau',
      ],
      value: {
        description:
          'Liqueur française d’orange, claire et intense.',

        aromatic_profile:
          'Orange fraîche, zestes, fleurs blanches et épices légères.',

        history:
          'Cointreau est née à Angers au XIXe siècle.',

        production_method:
          'Distillation d’écorces d’oranges douces et amères puis assemblage.',

        anecdote:
          'Cointreau est un ingrédient majeur de cocktails comme la Margarita, le Sidecar et le Cosmopolitan.',
      },
    },

    {
      keys: [
        'grand marnier',
      ],
      value: {
        description:
          'Liqueur française d’orange associant agrumes et cognac.',

        aromatic_profile:
          'Orange confite, zestes, vanille, caramel, bois et épices.',

        history:
          'Grand Marnier est une liqueur française historique créée à la fin du XIXe siècle.',

        production_method:
          'Assemblage d’essence d’orange amère avec du cognac puis maturation.',

        anecdote:
          'Sa base de cognac lui donne un profil différent d’un triple sec classique.',
      },
    },

    {
      keys: [
        'kahlua',
        'kahlúa',
      ],
      value: {
        description:
          'Liqueur de café mexicaine douce et gourmande.',

        aromatic_profile:
          'Café torréfié, caramel, vanille et cacao.',

        history:
          'Kahlúa est originaire du Mexique et s’est imposée comme l’une des liqueurs de café les plus connues.',

        production_method:
          'Liqueur élaborée autour du café, du sucre et d’une base alcoolisée.',

        anecdote:
          'Kahlúa est notamment utilisée dans le White Russian et le Black Russian.',
      },
    },

    {
      keys: [
        'baileys',
        'bailey',
      ],
      value: {
        description:
          'Liqueur irlandaise crémeuse associant crème et whiskey irlandais.',

        aromatic_profile:
          'Crème, cacao, vanille, caramel et whiskey doux.',

        history:
          'Baileys Original Irish Cream a été lancé dans les années 1970.',

        production_method:
          'Assemblage de crème, spiritueux irlandais, sucre et arômes.',

        anecdote:
          'Les ingrédients très acides peuvent faire cailler une liqueur contenant de la crème.',
      },
    },

    {
      keys: [
        'campari',
      ],
      value: {
        description:
          'Amer italien rouge, intense et complexe, emblématique de l’aperitivo.',

        aromatic_profile:
          'Orange amère, herbes, racines, épices et amertume persistante.',

        history:
          'Campari est né en Italie au XIXe siècle.',

        production_method:
          'La recette exacte et l’assemblage des ingrédients aromatiques sont confidentiels.',

        anecdote:
          'Le Negroni et l’Americano comptent parmi les cocktails les plus célèbres utilisant Campari.',
      },
    },

    {
      keys: [
        'st germain',
        'saint germain',
      ],
      value: {
        description:
          'Liqueur florale élaborée à partir de fleurs de sureau.',

        aromatic_profile:
          'Fleur de sureau, poire, agrumes, fruits blancs et notes miellées.',

        history:
          'St-Germain a contribué à populariser la fleur de sureau dans le cocktail contemporain.',

        production_method:
          'Liqueur élaborée à partir de fleurs de sureau et d’une base alcoolisée sucrée.',

        anecdote:
          'Une petite quantité suffit généralement pour apporter une signature florale très reconnaissable.',
      },
    },

    {
      keys: [
        'fernet branca',
      ],
      value: {
        description:
          'Fernet italien très amer, herbacé et mentholé.',

        aromatic_profile:
          'Herbes amères, menthe, réglisse, racines et épices.',

        history:
          'Fernet-Branca est une référence historique de la famille des fernet italiens.',

        production_method:
          'Assemblage de plantes, racines et épices puis maturation.',

        anecdote:
          'En Argentine, le Fernet accompagné de cola est particulièrement populaire.',
      },
    },

    {
      keys: [
        'veuve clicquot grande dame',
        'grande dame',
      ],
      value: {
        description:
          'Cuvée prestige de la maison Veuve Clicquot.',

        aromatic_profile:
          'Agrumes, fruits blancs, brioche, noisette, fleurs et épices.',

        history:
          'La Grande Dame rend hommage à Madame Clicquot.',

        production_method:
          'Méthode traditionnelle champenoise avec seconde fermentation en bouteille et élevage sur lies.',

        anecdote:
          'Le nom La Grande Dame fait directement référence à Madame Clicquot.',
      },
    },

    {
      keys: [
        'veuve clicquot',
      ],
      value: {
        description:
          'Champagne de la maison Veuve Clicquot.',

        aromatic_profile:
          'Fruits, agrumes, brioche et notes toastées, avec des variations selon la cuvée.',

        history:
          'La maison Veuve Clicquot est profondément liée à Madame Clicquot, figure majeure de l’histoire du Champagne au XIXe siècle.',

        production_method:
          'Méthode traditionnelle champenoise avec seconde fermentation en bouteille et élevage sur lies.',

        anecdote:
          'Madame Clicquot est historiquement associée au développement de techniques de remuage du Champagne.',
      },
    },

    {
      keys: [
        'hinano',
      ],
      value: {
        description:
          'Bière emblématique de Tahiti.',

        aromatic_profile:
          'Céréales, malt, fraîcheur et amertume modérée selon la référence.',

        history:
          'Hinano est une marque fortement associée à Tahiti et à la Polynésie française.',

        production_method:
          'Brassage, fermentation puis conditionnement. Les ingrédients et procédés précis dépendent de la référence.',

        anecdote:
          'Le nom et l’identité visuelle Hinano sont devenus particulièrement reconnaissables en Polynésie française.',
      },
    },

    {
      keys: [
        'chablis',
      ],
      value: {
        description:
          'Vin blanc de Bourgogne élaboré à partir de Chardonnay.',

        aromatic_profile:
          'Agrumes, pomme, fleurs blanches, fruits à chair blanche et notes minérales.',

        history:
          'Chablis se situe dans le nord de la Bourgogne et est célèbre pour ses vins blancs.',

        production_method:
          'Vinification du Chardonnay. L’utilisation de cuves ou de fûts dépend du producteur et de la cuvée.',

        anecdote:
          'Les vins de l’appellation Chablis sont élaborés à partir de Chardonnay.',
      },
    },

    {
      keys: [
        'chassagne montrachet',
        'chassagne-montrachet',
      ],
      value: {
        description:
          'Vin de Bourgogne issu de l’appellation Chassagne-Montrachet.',

        aromatic_profile:
          'Pour les blancs : agrumes, fruits blancs, fleurs, noisette et minéralité. Le profil dépend du domaine et du millésime.',

        history:
          'Chassagne-Montrachet est une appellation prestigieuse de la Côte de Beaune.',

        production_method:
          'La méthode dépend du producteur, du cépage et de la cuvée.',

        anecdote:
          'Chassagne-Montrachet produit aussi bien des vins blancs que des vins rouges.',
      },
    },

    {
      keys: [
        'gevrey chambertin',
        'gevrey-chambertin',
      ],
      value: {
        description:
          'Vin rouge de Bourgogne issu principalement de Pinot Noir.',

        aromatic_profile:
          'Cerise, framboise, cassis, épices et sous-bois selon l’âge et le producteur.',

        history:
          'Gevrey-Chambertin est l’un des villages les plus célèbres de la Côte de Nuits.',

        production_method:
          'Vinification du Pinot Noir puis élevage selon les choix du domaine.',

        anecdote:
          'Gevrey-Chambertin compte plusieurs grands crus parmi les plus prestigieux de Bourgogne.',
      },
    },

    {
      keys: [
        'pommard',
      ],
      value: {
        description:
          'Vin rouge de Bourgogne issu de Pinot Noir.',

        aromatic_profile:
          'Cerise noire, mûre, prune, épices, terre et sous-bois selon le domaine et le millésime.',

        history:
          'Pommard est une appellation historique de la Côte de Beaune.',

        production_method:
          'Vinification du Pinot Noir puis élevage selon les choix du producteur.',

        anecdote:
          'Pommard est réputé pour des Pinot Noir souvent structurés.',
      },
    },

    {
      keys: [
        'cote rotie',
        'côte rôtie',
        'côte-rôtie',
      ],
      value: {
        description:
          'Vin rouge du Rhône septentrional dominé par la Syrah.',

        aromatic_profile:
          'Mûre, cassis, violette, poivre noir, olive et épices.',

        history:
          'Côte-Rôtie est une appellation historique du Rhône septentrional.',

        production_method:
          'Vinification principalement de Syrah. Une proportion de Viognier peut être utilisée dans le cadre de l’appellation.',

        anecdote:
          'Côte-Rôtie signifie littéralement « côte rôtie ».',
      },
    },

    {
      keys: [
        'barolo',
      ],
      value: {
        description:
          'Vin rouge du Piémont italien élaboré à partir de Nebbiolo.',

        aromatic_profile:
          'Rose, cerise, fruits rouges, réglisse, épices et sous-bois.',

        history:
          'Barolo est l’une des appellations les plus prestigieuses d’Italie.',

        production_method:
          'Vinification du Nebbiolo puis élevage réglementé avant commercialisation.',

        anecdote:
          'Le Nebbiolo peut conserver une couleur relativement claire tout en développant une structure tannique importante.',
      },
    },

    {
      keys: [
        'solaia',
      ],
      value: {
        description:
          'Grand vin rouge toscan produit par Antinori.',

        aromatic_profile:
          'Cassis, cerise noire, cacao, tabac, épices et notes boisées.',

        history:
          'Solaia fait partie des grands vins modernes de Toscane.',

        production_method:
          'Assemblage de cépages rouges vinifiés puis élevés avant assemblage final selon le millésime.',

        anecdote:
          'Solaia est devenu l’un des vins emblématiques de la famille Antinori.',
      },
    },

    {
      keys: [
        'ornellaia',
        'serre nuove',
      ],
      value: {
        description:
          'Vin rouge de Bolgheri en Toscane élaboré dans un style inspiré des assemblages bordelais.',

        aromatic_profile:
          'Cassis, mûre, prune, épices, tabac et herbes méditerranéennes.',

        history:
          'Bolgheri s’est imposé comme l’une des grandes régions des vins modernes italiens.',

        production_method:
          'Vinification de plusieurs cépages puis assemblage et élevage selon la cuvée.',

        anecdote:
          'Bolgheri est notamment célèbre pour l’utilisation de cépages comme Cabernet Sauvignon, Merlot et Cabernet Franc.',
      },
    },
  ]

  for (const rule of rules) {
    const matches =
      rule.keys.some(
        (key) =>
          n.includes(
            normalize(key)
          )
      )

    if (matches) {
      return rule.value
    }
  }

  return null
}

/*
 * IMPORTANT :
 *
 * Si nous n'avons pas une fiche spécifique suffisamment
 * fiable pour une référence, on NE FABRIQUE PAS
 * d'information.
 *
 * On écrit simplement R.A.S.
 */
function fallbackSheet() {
  return {
    description: RAS,
    aromatic_profile: RAS,
    history: RAS,
    production_method: RAS,
    anecdote: RAS,
  }
}

function buildSheet(product) {
  return (
    exactSheet(product) ||
    fallbackSheet()
  )
}

console.log('')
console.log(
  '========================================'
)
console.log(
  'REMISE À PLAT FICHES PRODUITS BAR TEAM'
)
console.log(
  '========================================'
)
console.log('')

const {
  data: products,
  error: productError,
} =
  await admin
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
    .order('name')

if (productError) {
  throw productError
}

console.log(
  `Produits actifs trouvés : ${
    products?.length || 0
  }`
)

console.log('')

let updated = 0
let precise = 0
let ras = 0
let errors = 0

for (
  const product
  of products || []
) {
  const exact =
    exactSheet(product)

  const generated =
    exact ||
    fallbackSheet()

  const payload = {
    product_id:
      product.id,

    description:
      generated.description ||
      RAS,

    aromatic_profile:
      generated.aromatic_profile ||
      RAS,

    history:
      generated.history ||
      RAS,

    production_method:
      generated.production_method ||
      RAS,

    anecdote:
      generated.anecdote ||
      RAS,

    /*
     * Ancien champ volontairement vidé.
     *
     * La nouvelle fiche ne doit contenir que :
     *
     * - Descriptif
     * - Profil aromatique
     * - Histoire
     * - Méthode de fabrication
     * - Anecdote
     */
    service_notes: '',

    updated_at:
      new Date()
        .toISOString(),
  }

  const {
    error,
  } =
    await admin
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
      `ERREUR : ${product.name} — ${error.message}`
    )

    continue
  }

  updated += 1

  if (exact) {
    precise += 1

    console.log(
      `MIS À JOUR [INFO] : ${product.name}`
    )
  } else {
    ras += 1

    console.log(
      `MIS À JOUR [R.A.S] : ${product.name}`
    )
  }
}

console.log('')
console.log(
  '========================================'
)
console.log(
  'TERMINÉ'
)
console.log(
  '========================================'
)

console.log(
  `Produits actifs : ${
    products?.length || 0
  }`
)

console.log(
  `Fiches mises à jour : ${updated}`
)

console.log(
  `Fiches avec informations : ${precise}`
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

if (errors === 0) {
  console.log(
    'SUCCÈS — Toutes les fiches ont été remises au nouveau format.'
  )
}