import { createClient } from '@supabase/supabase-js'

/*
=========================================================
NUKUSTOCK / BAR NUKU
ENRICHISSEMENT AUTOMATIQUE DES FICHES PRODUITS
=========================================================

Ce script :

- récupère TOUS les produits actifs de NukuStock
- crée une fiche Bar Team pour chaque produit
- adapte les textes selon catégorie / sous-catégorie
- ajoute des informations spécifiques pour les grandes références
- conserve les textes déjà remplis manuellement
- ne crée aucun doublon
- utilise product_id comme clé unique

TABLE :
public.bar_product_sheets

CHAMPS :
description
history
production_method
aromatic_profile
anecdote
service_notes
=========================================================
*/

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local'
  )
}

const admin =
  createClient(
    url,
    serviceRole,
    {
      auth: {
        autoRefreshToken:
          false,

        persistSession:
          false,

        detectSessionInUrl:
          false,
      },
    }
  )

/*
=========================================================
OUTILS
=========================================================
*/

function normalize(value) {
  return String(
    value || ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(
      /[’']/g,
      ''
    )
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .trim()
}

function cleanProductName(
  name
) {
  return String(
    name || ''
  )
    .replace(
      /\s*-\s*(Bouteille|Canette|Boite|Magnum Bouteille|Magnum|Jeroboam)\s+.*$/i,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

function includesAny(
  value,
  ...searches
) {
  const source =
    normalize(value)

  return searches.some(
    search =>
      source.includes(
        normalize(search)
      )
  )
}

/*
=========================================================
FICHE VIDE
=========================================================
*/

function emptySheet() {
  return {
    description:
      '',

    history:
      '',

    production_method:
      '',

    aromatic_profile:
      '',

    anecdote:
      '',

    service_notes:
      '',
  }
}

/*
=========================================================
VINS
=========================================================
*/

function wineSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  /*
  CHABLIS
  */
  if (
    includesAny(
      name,
      'Chablis'
    )
  ) {
    return {
      description:
        `${name} est un vin blanc de Bourgogne élaboré à partir de Chardonnay. Le style de Chablis recherche généralement fraîcheur, tension et minéralité.`,

      history:
        `Chablis se situe dans le nord de la Bourgogne. L'appellation est particulièrement connue pour ses Chardonnay élevés dans un climat frais et sur des sols riches en calcaire.`,

      production_method:
        `Vin blanc issu de Chardonnay. La vinification varie selon le domaine : cuves inox, fûts ou combinaison des deux, avec un travail généralement orienté vers la fraîcheur et la précision.`,

      aromatic_profile:
        `Agrumes, pomme verte, fleurs blanches, fruits à chair blanche, notes minérales et parfois une finale légèrement saline.`,

      anecdote:
        `Chablis est élaboré exclusivement à partir de Chardonnay, malgré un style souvent très différent des Chardonnay plus riches du sud de la Bourgogne.`,

      service_notes:
        `Cépage : Chardonnay. Servir autour de 10–12 °C. Très adapté aux huîtres, fruits de mer, poissons et entrées délicates.`,
    }
  }

  /*
  CHASSAGNE-MONTRACHET
  */
  if (
    includesAny(
      name,
      'Chassagne Montrachet',
      'Chassagne-Montrachet'
    )
  ) {
    return {
      description:
        `${name} est un vin de Bourgogne issu d'une appellation prestigieuse de la Côte de Beaune. Les blancs sont particulièrement réputés pour leur richesse et leur précision.`,

      history:
        `Chassagne-Montrachet fait partie des villages emblématiques de la Côte de Beaune, aux côtés de Puligny-Montrachet et Meursault.`,

      production_method:
        `Pour les blancs, Chardonnay vinifié puis généralement élevé en fûts, avec une proportion de bois neuf variable selon le domaine et la cuvée.`,

      aromatic_profile:
        `Agrumes mûrs, pêche, poire, fleurs blanches, noisette, beurre frais, vanille légère et minéralité.`,

      anecdote:
        `Le village produit aussi du Pinot Noir, même si sa réputation internationale repose largement sur ses grands vins blancs.`,

      service_notes:
        `Cépage principal des blancs : Chardonnay. Servir autour de 11–13 °C. Excellent avec crustacés, poissons nobles et volailles.`,
    }
  }

  /*
  GEVREY
  */
  if (
    includesAny(
      name,
      'Gevrey Chambertin',
      'Gevrey-Chambertin'
    )
  ) {
    return {
      description:
        `${name} est un Pinot Noir de Bourgogne, généralement structuré et profond, provenant de la Côte de Nuits.`,

      history:
        `Gevrey-Chambertin est l'un des villages les plus célèbres de la Côte de Nuits et abrite plusieurs Grands Crus prestigieux.`,

      production_method:
        `Vin rouge issu de Pinot Noir, fermenté puis généralement élevé en fûts de chêne avec une proportion de bois neuf variable.`,

      aromatic_profile:
        `Cerise, framboise, cassis, mûre, épices, sous-bois, réglisse et notes animales avec l'évolution.`,

      anecdote:
        `Gevrey-Chambertin possède une réputation de vins généralement plus structurés et puissants que beaucoup d'autres appellations de Pinot Noir bourguignon.`,

      service_notes:
        `Cépage : Pinot Noir. Servir autour de 15–17 °C. Une légère aération peut être utile selon le millésime.`,
    }
  }

  /*
  POMMARD
  */
  if (
    includesAny(
      name,
      'Pommard'
    )
  ) {
    return {
      description:
        `${name} est un vin rouge de la Côte de Beaune élaboré à partir de Pinot Noir, réputé pour son caractère structuré.`,

      history:
        `Pommard est l'une des appellations rouges historiques de Bourgogne et se situe entre Beaune et Volnay.`,

      production_method:
        `Pinot Noir fermenté puis généralement élevé en fûts de chêne.`,

      aromatic_profile:
        `Cerise noire, mûre, prune, épices, terre, sous-bois et structure tannique.`,

      anecdote:
        `Pommard est souvent considéré comme l'un des Pinot Noir les plus structurés de la Côte de Beaune.`,

      service_notes:
        `Cépage : Pinot Noir. Servir autour de 16 °C.`,
    }
  }

  /*
  CÔTE-RÔTIE
  */
  if (
    includesAny(
      name,
      'Cote Rotie',
      'Côte Rotie',
      'Côte-Rôtie'
    )
  ) {
    return {
      description:
        `${name} est un grand vin rouge du Rhône septentrional dominé par la Syrah.`,

      history:
        `Côte-Rôtie est l'une des appellations historiques du Rhône septentrional. Les vignes sont plantées sur des coteaux extrêmement pentus au-dessus du Rhône.`,

      production_method:
        `Vinification de Syrah. Une petite proportion de Viognier peut être utilisée en cofermentation selon le domaine.`,

      aromatic_profile:
        `Mûre, cassis, violette, poivre noir, olive, fumée, viande séchée et épices.`,

      anecdote:
        `Côte-Rôtie signifie littéralement « côte rôtie », en référence aux coteaux fortement exposés au soleil.`,

      service_notes:
        `Cépage principal : Syrah. Servir autour de 16–18 °C.`,
    }
  }

  /*
  BAROLO
  */
  if (
    includesAny(
      name,
      'Barolo'
    )
  ) {
    return {
      description:
        `${name} est un grand vin rouge du Piémont italien élaboré exclusivement à partir de Nebbiolo.`,

      history:
        `Barolo est produit dans les Langhe, au Piémont. L'appellation est l'une des plus prestigieuses d'Italie.`,

      production_method:
        `Vinification du Nebbiolo suivie d'un élevage réglementé avant commercialisation.`,

      aromatic_profile:
        `Rose, cerise, fraise, goudron, réglisse, épices, cuir et sous-bois avec l'évolution.`,

      anecdote:
        `Le Nebbiolo possède une couleur souvent relativement claire malgré une structure tannique très importante.`,

      service_notes:
        `Cépage : Nebbiolo. Servir autour de 16–18 °C. Les jeunes millésimes peuvent nécessiter une longue aération.`,
    }
  }

  /*
  SOLAIA
  */
  if (
    includesAny(
      name,
      'Solaia'
    )
  ) {
    return {
      description:
        `${name} est un grand vin rouge toscan produit par Antinori, puissant mais élégant.`,

      history:
        `Solaia est né en Toscane dans le contexte du développement des grands vins modernes parfois qualifiés de Super Toscans.`,

      production_method:
        `Assemblage de cépages rouges vinifiés séparément puis élevés en barriques avant assemblage.`,

      aromatic_profile:
        `Cassis, cerise noire, prune, cacao, tabac, épices, vanille et bois noble.`,

      anecdote:
        `Solaia est devenu l'un des vins emblématiques de la famille Antinori.`,

      service_notes:
        `Cépages : principalement Cabernet Sauvignon avec Sangiovese et Cabernet Franc. Servir autour de 16–18 °C.`,
    }
  }

  /*
  ORNELLAIA / SERRE NUOVE
  */
  if (
    includesAny(
      name,
      'Ornellaia',
      'Serre Nuove'
    )
  ) {
    return {
      description:
        `${name} est un vin rouge de Bolgheri en Toscane, élaboré dans un style inspiré des grands assemblages bordelais.`,

      history:
        `Bolgheri s'est imposé comme l'une des régions majeures des grands vins modernes italiens.`,

      production_method:
        `Assemblage de cépages bordelais vinifiés séparément puis élevés en barriques.`,

      aromatic_profile:
        `Cassis, mûre, prune, épices, tabac, herbes méditerranéennes et boisé élégant.`,

      anecdote:
        `La région de Bolgheri a bâti sa réputation internationale grâce à des cépages comme Cabernet Sauvignon, Merlot et Cabernet Franc.`,

      service_notes:
        `Cépages généralement : Merlot, Cabernet Sauvignon, Cabernet Franc et Petit Verdot selon la cuvée et le millésime. Servir 16–18 °C.`,
    }
  }

  /*
  BORDEAUX
  */
  if (
    includesAny(
      name,
      'Pauillac',
      'Saint Estephe',
      'Saint-Estephe',
      'St Estephe',
      'St Julien',
      'Saint Julien',
      'Saint-Julien',
      'Lalande Pomerol',
      'Lalande-Pomerol'
    )
  ) {
    return {
      description:
        `${name} est un vin rouge bordelais d'assemblage présentant généralement structure, profondeur et potentiel d'évolution.`,

      history:
        `Les grands vignobles bordelais ont développé une tradition d'assemblage de plusieurs cépages afin d'obtenir équilibre et complexité.`,

      production_method:
        `Vinification séparée ou partiellement séparée des cépages puis assemblage et élevage, souvent en fûts de chêne.`,

      aromatic_profile:
        `Cassis, mûre, prune, cèdre, graphite, tabac, épices et notes boisées.`,

      anecdote:
        `Le Cabernet Sauvignon domine souvent sur la rive gauche de Bordeaux alors que le Merlot occupe une place majeure sur la rive droite.`,

      service_notes:
        `Cépages : assemblage bordelais selon le château et le millésime. Servir autour de 16–18 °C.`,
    }
  }

  /*
  PROVENCE ROSÉ
  */
  if (
    includesAny(
      name,
      'Romassan',
      'Ott',
      'Bandol'
    )
  ) {
    return {
      description:
        `${name} est un rosé méditerranéen sec et gastronomique, recherchant fraîcheur et complexité.`,

      history:
        `La Provence est l'une des régions historiques du rosé français et possède aujourd'hui une réputation internationale.`,

      production_method:
        `Assemblage de cépages méditerranéens avec pressurage direct et/ou courte macération selon la cuvée.`,

      aromatic_profile:
        `Pêche, agrumes, fruits rouges délicats, fleurs, épices et finale saline.`,

      anecdote:
        `Les grands rosés de gastronomie peuvent gagner en complexité avec quelques années de bouteille.`,

      service_notes:
        `Cépages variables selon la cuvée. Servir autour de 9–11 °C.`,
    }
  }

  /*
  VIN GÉNÉRIQUE
  */
  return {
    description:
      `${name} est une référence vin de la sélection NukuStock. La fiche Bar Team regroupe les principaux repères utiles au service.`,

    history:
      `L'histoire détaillée du domaine et de cette cuvée devra être complétée à partir de la documentation officielle du producteur.`,

    production_method:
      `Vinification propre au domaine, à l'appellation et au millésime. Les informations précises doivent être confirmées sur la fiche technique officielle.`,

    aromatic_profile:
      `Profil aromatique à adapter au domaine, à l'appellation, au cépage et au millésime.`,

    anecdote:
      `Toujours vérifier le millésime et l'appellation sur la bouteille avant de présenter le vin au client.`,

    service_notes:
      `Température et verrerie à adapter au style du vin. Cépage à confirmer sur la fiche officielle du domaine.`,
  }
}

/*
=========================================================
CHAMPAGNES
=========================================================
*/

function champagneSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  if (
    includesAny(
      name,
      'Veuve Clicquot Brut'
    )
  ) {
    return {
      description:
        `Veuve Clicquot Brut est un Champagne de maison au style structuré, vineux et fruité.`,

      history:
        `La maison Veuve Clicquot est profondément liée à Madame Clicquot, figure majeure de l'histoire du Champagne au XIXe siècle.`,

      production_method:
        `Méthode traditionnelle champenoise : assemblage, seconde fermentation en bouteille, élevage sur lies, remuage, dégorgement puis dosage.`,

      aromatic_profile:
        `Pomme, poire, agrumes, fruits jaunes, brioche et notes toastées.`,

      anecdote:
        `Madame Clicquot est associée au perfectionnement de la table de remuage, technique devenue essentielle dans la méthode traditionnelle.`,

      service_notes:
        `Servir autour de 8–10 °C. Éviter de servir trop froid afin de préserver les arômes.`,
    }
  }

  if (
    includesAny(
      name,
      'Grande Dame'
    )
  ) {
    return {
      description:
        `${name} est une cuvée prestige de la maison Veuve Clicquot.`,

      history:
        `La Grande Dame rend hommage à Madame Clicquot et représente l'une des expressions haut de gamme de la maison.`,

      production_method:
        `Méthode traditionnelle champenoise avec sélection de raisins issus de grands terroirs et long vieillissement sur lies.`,

      aromatic_profile:
        `Agrumes, fruits blancs, brioche, noisette, fleurs, épices et grande longueur.`,

      anecdote:
        `Le nom « Grande Dame » fait directement référence à Madame Clicquot.`,

      service_notes:
        `Servir autour de 10–12 °C dans un verre à vin ou une flûte large permettant l'expression aromatique.`,
    }
  }

  return {
    description:
      `${name} est un Champagne de la sélection NukuStock destiné au service à l'apéritif, à table ou lors des occasions de célébration.`,

    history:
      `La Champagne est une région viticole française protégée par une appellation d'origine. L'histoire spécifique de cette maison doit être complétée à partir de sa documentation officielle.`,

    production_method:
      `Méthode traditionnelle : première fermentation, assemblage, seconde fermentation en bouteille, élevage sur lies, remuage, dégorgement et dosage.`,

    aromatic_profile:
      `Agrumes, pomme, poire, fleurs blanches, brioche et notes toastées selon la cuvée et son vieillissement.`,

    anecdote:
      `Les bulles sont créées par une seconde fermentation réalisée directement dans la bouteille.`,

    service_notes:
      `Servir généralement autour de 8–10 °C. Un Champagne complexe peut être servi légèrement moins froid.`,
  }
}

/*
=========================================================
BIÈRES
=========================================================
*/

function beerSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  const sub =
    normalize(
      product.subcategory
    )

  if (
    includesAny(
      name,
      'Hinano'
    )
  ) {
    return {
      description:
        `${name} est une bière emblématique de Tahiti, particulièrement adaptée à un service frais sous climat tropical.`,

      history:
        `Hinano est devenue l'une des marques les plus reconnaissables de Tahiti et de la Polynésie française.`,

      production_method:
        `Brassage à partir de céréales maltées, houblon, eau et levure. Le procédé exact dépend de la version : classique, ambrée ou autre expression.`,

      aromatic_profile:
        includesAny(
          name,
          'Ambree',
          'Ambrée'
        )
          ? `Malt toasté, caramel léger, céréales et amertume modérée.`
          : `Céréales, malt léger, fraîcheur, légère amertume et finale désaltérante.`,

      anecdote:
        `Le nom Hinano et son identité visuelle sont devenus des symboles immédiatement associés à Tahiti.`,

      service_notes:
        `Servir bien fraîche dans une verrerie parfaitement propre.`,
    }
  }

  if (
    includesAny(
      name,
      'Heineken 0'
    )
  ) {
    return {
      description:
        `Heineken 0.0 est une bière sans alcool conçue pour conserver un profil de lager légère et rafraîchissante.`,

      history:
        `Heineken est une brasserie néerlandaise fondée au XIXe siècle à Amsterdam.`,

      production_method:
        `Bière brassée puis désalcoolisée ou ajustée selon le procédé spécifique de la marque afin d'obtenir une teneur en alcool très faible.`,

      aromatic_profile:
        `Malt léger, céréales, notes fruitées discrètes et amertume modérée.`,

      anecdote:
        `Les bières sans alcool nécessitent un travail particulier pour conserver les arômes tout en réduisant fortement l'alcool.`,

      service_notes:
        `Servir très fraîche.`,
    }
  }

  return {
    description:
      `${name} est une bière de la sélection NukuStock référencée pour le service Bar Team.`,

    history:
      `L'histoire de la brasserie doit être complétée à partir des informations officielles de la marque.`,

    production_method:
      `Brassage de céréales maltées, houblonnage, fermentation puis maturation. Le procédé varie selon le style.`,

    aromatic_profile:
      sub.includes(
        'sans alcool'
      )
        ? `Profil léger et rafraîchissant, avec malt, céréales et amertume modérée.`
        : `Malt, céréales, houblon et notes fruitées ou toastées variables selon le style.`,

    anecdote:
      `La température, le verre et la qualité du service influencent directement la mousse et la perception des arômes.`,

    service_notes:
      `Servir fraîche dans une verrerie propre et adaptée.`,
  }
}

/*
=========================================================
SOFT DRINKS
=========================================================
*/

function softSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  const sub =
    normalize(
      product.subcategory
    )

  if (
    includesAny(
      name,
      'Fever Tree',
      'Fever-Tree'
    )
  ) {
    return {
      description:
        `${name} est un mixer premium destiné notamment aux long drinks et cocktails.`,

      history:
        `Fever-Tree s'est développée autour de l'idée qu'un cocktail composé majoritairement de mixer mérite un mixer de qualité.`,

      production_method:
        `Boisson gazeuse élaborée à partir d'eau gazéifiée, sucre ou édulcorant selon la référence, extraits et arômes.`,

      aromatic_profile:
        includesAny(
          name,
          'Ginger Beer'
        )
          ? `Gingembre intense, épices, fraîcheur et carbonatation marquée.`
          : `Profil frais, aromatique et fortement carbonaté, adapté au service premium.`,

      anecdote:
        `Dans un long drink, le mixer peut représenter la majorité du volume final : sa qualité influence donc directement le cocktail.`,

      service_notes:
        `Servir très frais. Verser délicatement pour préserver un maximum de carbonatation.`,
    }
  }

  if (
    sub.includes(
      'jus'
    )
  ) {
    return {
      description:
        `${name} est un jus ou une boisson fruitée référencée dans NukuStock pour le service et la préparation des cocktails.`,

      history:
        `Référence commerciale de la sélection NukuStock.`,

      production_method:
        `Jus ou boisson à base de fruits conditionné. La teneur en fruit et le procédé dépendent du fabricant.`,

      aromatic_profile:
        `Profil fruité correspondant au fruit ou à l'assemblage indiqué sur l'étiquette.`,

      anecdote:
        `La température et l'oxydation après ouverture peuvent modifier rapidement la fraîcheur aromatique d'un jus.`,

      service_notes:
        `Agiter si nécessaire. Conserver au froid après ouverture selon les recommandations du fabricant.`,
    }
  }

  if (
    sub.includes(
      'sirop'
    )
  ) {
    return {
      description:
        `${name} est un sirop concentré utilisé pour apporter sucre et aromatique aux cocktails.`,

      history:
        `Référence sirop de la sélection NukuStock.`,

      production_method:
        `Préparation concentrée sans alcool associant sucre et arômes.`,

      aromatic_profile:
        `Profil aromatique concentré correspondant au parfum indiqué.`,

      anecdote:
        `Un sirop modifie simultanément le sucre, la texture et l'aromatique d'un cocktail.`,

      service_notes:
        `Doser précisément. Éviter de surcharger le cocktail en sucre.`,
    }
  }

  if (
    sub.includes(
      'eaux gazeuse'
    )
  ) {
    return {
      description:
        `${name} est une eau gazeuse destinée au service direct ou à l'allongement des boissons.`,

      history:
        `Référence d'eau gazeuse de la sélection NukuStock.`,

      production_method:
        `Eau minérale ou eau embouteillée naturellement ou artificiellement gazeuse selon la marque.`,

      aromatic_profile:
        `Profil neutre à minéral, avec carbonatation.`,

      anecdote:
        `La taille et la persistance des bulles influencent fortement la sensation en bouche.`,

      service_notes:
        `Servir très fraîche et ouvrir au dernier moment afin de conserver la carbonatation.`,
    }
  }

  if (
    sub.includes(
      'eaux plate'
    )
  ) {
    return {
      description:
        `${name} est une eau plate destinée au service à table et au bar.`,

      history:
        `Référence d'eau de la sélection NukuStock.`,

      production_method:
        `Eau embouteillée dont la composition minérale dépend de la source.`,

      aromatic_profile:
        `Profil neutre à légèrement minéral selon la marque.`,

      anecdote:
        `La minéralisation d'une eau peut légèrement modifier la perception gustative des vins et spiritueux.`,

      service_notes:
        `Servir fraîche.`,
    }
  }

  if (
    sub.includes(
      'the'
    )
  ) {
    return {
      description:
        `${name} est une boisson sans alcool à base de thé destinée à être servie fraîche.`,

      history:
        `Référence de thé prêt à boire de la sélection NukuStock.`,

      production_method:
        `Boisson élaborée à partir de thé ou d'extrait de thé, puis aromatisée et sucrée selon la référence.`,

      aromatic_profile:
        `Thé, fruits ou fleurs selon la recette, avec légère amertume tannique.`,

      anecdote:
        `Les tanins du thé peuvent apporter une structure intéressante aux cocktails sans alcool.`,

      service_notes:
        `Servir très frais. Peut également servir de base à un long drink sans alcool.`,
    }
  }

  return {
    description:
      `${name} est une boisson sans alcool de la sélection NukuStock utilisée au service ou comme mixer.`,

    history:
      `Référence commerciale sélectionnée pour le service Bar Team.`,

    production_method:
      `Boisson prête à servir. La formulation et le procédé dépendent de la marque.`,

    aromatic_profile:
      `Profil aromatique propre à la référence.`,

    anecdote:
      `En cocktail, température, dilution et carbonatation influencent fortement la perception du mixer.`,

    service_notes:
      `Servir très frais et respecter les standards Bar Team.`,
  }
}

/*
=========================================================
SPIRITUEUX : RÉFÉRENCES SPÉCIFIQUES
=========================================================
*/

function specificSpiritSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  /*
  GREY GOOSE
  */
  if (
    includesAny(
      name,
      'Grey Goose'
    )
  ) {
    return {
      description:
        `Grey Goose est une vodka française premium connue pour sa texture ronde, sa grande netteté et sa finale douce.`,

      history:
        `Grey Goose a été créée dans les années 1990 avec l'ambition de développer une vodka premium élaborée en France.`,

      production_method:
        `Vodka élaborée en France notamment à partir de blé tendre français et d'eau.`,

      aromatic_profile:
        `Céréales fines, agrumes légers, douceur, texture soyeuse et finale propre.`,

      anecdote:
        `Malgré l'association historique de la vodka avec l'Europe de l'Est, Grey Goose revendique pleinement une identité française.`,

      service_notes:
        `Servir très frais, pur ou en Martini, Bloody Mary, Moscow Mule et autres cocktails premium.`,
    }
  }

  /*
  KETEL ONE
  */
  if (
    includesAny(
      name,
      'Ketel One'
    )
  ) {
    return {
      description:
        `Ketel One est une vodka néerlandaise au profil net, légèrement citronné et poivré.`,

      history:
        `Elle est produite par la famille Nolet aux Pays-Bas, famille de distillateurs dont l'histoire remonte au XVIIe siècle.`,

      production_method:
        `Vodka de blé produite grâce à une combinaison de techniques modernes et de distillation en alambic cuivre pour une partie du distillat.`,

      aromatic_profile:
        `Agrumes fins, céréales, poivre blanc et texture souple.`,

      anecdote:
        `Le nom Ketel One fait référence à l'un des alambics historiques de la distillerie Nolet.`,

      service_notes:
        `Martini, Bloody Mary, Vodka Soda ou service pur.`,
    }
  }

  /*
  BELVEDERE
  */
  if (
    includesAny(
      name,
      'Belvedere'
    )
  ) {
    return {
      description:
        `Belvedere est une vodka polonaise premium au profil structuré, crémeux et légèrement poivré.`,

      history:
        `Belvedere s'inscrit dans la tradition polonaise de la vodka de seigle.`,

      production_method:
        `Vodka élaborée principalement à partir de seigle et d'eau, puis distillée afin de conserver une texture céréalière.`,

      aromatic_profile:
        `Seigle, poivre blanc, vanille légère, texture crémeuse et finale nette.`,

      anecdote:
        `Son nom fait référence au palais du Belvédère de Varsovie, représenté sur la bouteille.`,

      service_notes:
        `Pur, très frais, Martini ou Vodka Soda premium.`,
    }
  }

  /*
  HENDRICK'S
  */
  if (
    includesAny(
      name,
      'Hendricks',
      "Hendrick's"
    )
  ) {
    return {
      description:
        `Hendrick's est un gin écossais moderne reconnaissable à ses notes de concombre et de rose.`,

      history:
        `Hendrick's a participé au renouveau mondial du gin premium à partir de la fin des années 1990.`,

      production_method:
        `Gin produit avec deux systèmes de distillation différents puis assemblé et complété avec des essences de concombre et de rose.`,

      aromatic_profile:
        `Genièvre délicat, concombre, rose, agrumes et épices douces.`,

      anecdote:
        `Le service avec une tranche de concombre est devenu l'une des signatures de la marque.`,

      service_notes:
        `Excellent en Gin & Tonic avec concombre ou en Martini.`,
    }
  }

  /*
  KI NO BI
  */
  if (
    includesAny(
      name,
      'Kinobi',
      'Ki No Bi'
    )
  ) {
    return {
      description:
        `KI NO BI est un gin japonais sec et précis produit à Kyoto avec plusieurs botaniques japonaises.`,

      history:
        `KI NO BI s'inscrit dans le développement contemporain des spiritueux artisanaux japonais.`,

      production_method:
        `Plusieurs groupes de botaniques sont distillés séparément avant assemblage. La recette utilise notamment des ingrédients japonais.`,

      aromatic_profile:
        `Yuzu, genièvre, agrumes, thé, épices japonaises et finale sèche.`,

      anecdote:
        `KI NO BI signifie « la beauté des saisons ».`,

      service_notes:
        `Gin & Tonic sec ou Martini. Éviter les garnitures trop puissantes.`,
    }
  }

  /*
  BARR HILL
  */
  if (
    includesAny(
      name,
      'Barr Hill'
    )
  ) {
    return {
      description:
        `Barr Hill est un gin américain original associant genièvre et miel.`,

      history:
        `Barr Hill est produit dans le Vermont et son identité est fortement liée à l'apiculture.`,

      production_method:
        `Gin construit autour du genièvre puis fini avec du miel brut.`,

      aromatic_profile:
        `Genièvre, fleurs, miel, herbes et texture ronde.`,

      anecdote:
        `Le miel constitue véritablement l'une des signatures aromatiques du produit.`,

      service_notes:
        `Bee's Knees, Gin Sour ou Gin & Tonic peu sucré.`,
    }
  }

  /*
  BACARDI
  */
  if (
    includesAny(
      name,
      'Bacardi Carta Blanca',
      'Bacardi Superior'
    )
  ) {
    return {
      description:
        `Bacardí Carta Blanca est un rhum blanc léger de style cubain destiné notamment aux cocktails.`,

      history:
        `Bacardí a été fondée à Santiago de Cuba en 1862 et a joué un rôle important dans le développement du rhum léger moderne.`,

      production_method:
        `Assemblage de distillats de mélasse, vieillissement puis filtration pour obtenir un rhum clair et léger.`,

      aromatic_profile:
        `Vanille légère, amande, agrumes, canne et finale sèche.`,

      anecdote:
        `Daiquiri et Cuba Libre sont étroitement associés au développement des rhums légers de style cubain.`,

      service_notes:
        `Daiquiri, Mojito, Cuba Libre et cocktails tropicaux.`,
    }
  }

  /*
  HAVANA CLUB
  */
  if (
    includesAny(
      name,
      'Havana Club'
    )
  ) {
    return {
      description:
        `Havana Club est un rhum cubain de tradition espagnole particulièrement lié aux grands cocktails de La Havane.`,

      history:
        `La marque est étroitement associée à l'histoire du rhum cubain et à la culture cocktail de Cuba.`,

      production_method:
        `Rhum issu de mélasse, fermenté, distillé, élevé puis assemblé selon l'expression.`,

      aromatic_profile:
        `Canne, vanille légère, fruits, agrumes et notes boisées variables avec le vieillissement.`,

      anecdote:
        `Mojito, Daiquiri et Cuba Libre sont trois cocktails emblématiques du rhum cubain.`,

      service_notes:
        `Les expressions jeunes sont particulièrement adaptées au Mojito et au Daiquiri. Les expressions âgées peuvent être dégustées pures.`,
    }
  }

  /*
  DIPLOMATICO
  */
  if (
    includesAny(
      name,
      'Diplomatico Reserva Exclusiva'
    )
  ) {
    return {
      description:
        `Diplomático Reserva Exclusiva est un rhum vénézuélien riche et gourmand.`,

      history:
        `Diplomático est produit au Venezuela et Reserva Exclusiva est l'une des expressions emblématiques de la maison.`,

      production_method:
        `Assemblage de rhums provenant de différents procédés de distillation puis vieillissement en fûts.`,

      aromatic_profile:
        `Caramel, orange confite, vanille, cacao, fruits secs et épices.`,

      anecdote:
        `Son profil rond et accessible en fait souvent une excellente introduction aux rhums vieux.`,

      service_notes:
        `Servir pur ou sur un gros glaçon. Peut également fonctionner dans un Old Fashioned au rhum.`,
    }
  }

  /*
  CLEMENT XO
  */
  if (
    includesAny(
      name,
      'Clement XO',
      'Clément XO'
    )
  ) {
    return {
      description:
        `Clément XO est un rhum agricole vieux de Martinique, complexe et boisé.`,

      history:
        `La maison Clément fait partie des noms historiques du rhum agricole martiniquais.`,

      production_method:
        `Fermentation de jus frais de canne, distillation puis long vieillissement et assemblage.`,

      aromatic_profile:
        `Canne, fruits secs, épices, cacao, orange, vanille et bois précieux.`,

      anecdote:
        `Le rhum agricole utilise directement le jus frais de canne, contrairement aux rhums élaborés à partir de mélasse.`,

      service_notes:
        `À privilégier pur dans un verre de dégustation.`,
    }
  }

  /*
  MANAO
  */
  if (
    includesAny(
      name,
      'Manao',
      "Mana'o"
    )
  ) {
    return {
      description:
        `Mana'o est un rhum polynésien mettant en avant la canne locale et un profil végétal très expressif.`,

      history:
        `Mana'o participe au renouveau du rhum de pur jus de canne en Polynésie française.`,

      production_method:
        `Jus frais de canne fermenté puis distillé afin de préserver les arômes de la matière première.`,

      aromatic_profile:
        `Canne fraîche, végétal, agrumes, fleurs et notes poivrées.`,

      anecdote:
        `Ce rhum exprime directement une matière première cultivée en Polynésie française.`,

      service_notes:
        `Ti' Punch, Daiquiri ou dégustation pure.`,
    }
  }

  /*
  PATRON AÑEJO
  */
  if (
    includesAny(
      name,
      'Patron Anejo',
      'Patrón Añejo'
    )
  ) {
    return {
      description:
        `Patrón Añejo est une tequila premium vieillie en fûts, plus ronde et boisée qu'une tequila Silver.`,

      history:
        `Patrón a joué un rôle majeur dans l'internationalisation de la tequila premium.`,

      production_method:
        `Agave bleu Weber cuit, extrait, fermenté et distillé puis vieilli en fûts pour atteindre la catégorie Añejo.`,

      aromatic_profile:
        `Agave cuit, vanille, caramel, chêne, poivre et fruits secs.`,

      anecdote:
        `Patrón est notamment connue pour l'utilisation d'une tahona traditionnelle dans une partie de sa production.`,

      service_notes:
        `Dégustation pure ou Old Fashioned de tequila.`,
    }
  }

  /*
  PATRON REPOSADO
  */
  if (
    includesAny(
      name,
      'Patron Reposado',
      'Patrón Reposado',
      'Roca Patron Reposado'
    )
  ) {
    return {
      description:
        `Patrón Reposado équilibre fraîcheur d'agave et notes apportées par le repos en fût.`,

      history:
        `Patrón est devenue l'une des marques les plus connues du segment premium de la tequila.`,

      production_method:
        `Agave bleu Weber cuit, fermenté et distillé, puis reposé en fûts de chêne.`,

      aromatic_profile:
        `Agave cuit, agrumes, vanille, miel léger, poivre et chêne.`,

      anecdote:
        `Reposado signifie littéralement « reposée » et désigne une tequila ayant passé une période réglementée en fût.`,

      service_notes:
        `Margarita premium ou dégustation pure.`,
    }
  }

  /*
  ROCA PATRON SILVER
  */
  if (
    includesAny(
      name,
      'Roca Patron Silver'
    )
  ) {
    return {
      description:
        `Roca Patrón Silver est une tequila premium axée sur l'expression de l'agave.`,

      history:
        `La gamme Roca Patrón a été conçue pour mettre particulièrement en avant la méthode traditionnelle de broyage à la tahona.`,

      production_method:
        `Agave bleu Weber cuit puis broyé à l'aide d'une tahona avant fermentation et distillation.`,

      aromatic_profile:
        `Agave cuit, agrumes, poivre, herbes et minéralité.`,

      anecdote:
        `Une tahona est une lourde roue de pierre traditionnellement utilisée pour écraser l'agave cuit.`,

      service_notes:
        `Margarita, Tommy's Margarita ou dégustation pure.`,
    }
  }

  /*
  DEL MAGUEY
  */
  if (
    includesAny(
      name,
      'Del Maguey'
    )
  ) {
    return {
      description:
        `Del Maguey est une maison de mezcal connue pour avoir contribué à faire connaître les mezcals artisanaux de villages.`,

      history:
        `La marque a participé à la reconnaissance internationale de petits producteurs et de traditions régionales du mezcal.`,

      production_method:
        `Agave cuit, souvent en fosse, broyé, fermenté puis distillé selon les méthodes du village et du producteur.`,

      aromatic_profile:
        `Fumée, agave rôti, herbes, agrumes, terre et minéralité.`,

      anecdote:
        `Le mezcal ne doit pas être résumé à une « tequila fumée » : les espèces d'agave et les méthodes sont extrêmement diverses.`,

      service_notes:
        `Servir pur en petites gorgées ou dans des cocktails où son caractère reste perceptible.`,
    }
  }

  /*
  DON Q
  */
  if (
    includesAny(
      name,
      'Don Q Gran Anejo'
    )
  ) {
    return {
      description:
        `Don Q Gran Añejo est un rhum portoricain vieux, élégant et boisé.`,

      history:
        `Don Q est une maison historique de Porto Rico liée à la famille Serrallés.`,

      production_method:
        `Rhum de mélasse distillé, vieilli en fûts puis assemblé.`,

      aromatic_profile:
        `Vanille, caramel, fruits secs, bois, épices et tabac.`,

      anecdote:
        `Le nom Don Q fait référence au personnage de Don Quichotte.`,

      service_notes:
        `Pur, sur gros glaçon ou Old Fashioned au rhum.`,
    }
  }

  /*
  LAGAVULIN
  */
  if (
    includesAny(
      name,
      'Lagavulin 16'
    )
  ) {
    return {
      description:
        `Lagavulin 16 ans est un single malt d'Islay emblématique, puissant, tourbé et maritime.`,

      history:
        `Lagavulin est l'une des distilleries historiques de la côte sud d'Islay en Écosse.`,

      production_method:
        `Single malt distillé en alambics puis vieilli au minimum 16 ans pour cette expression.`,

      aromatic_profile:
        `Tourbe, fumée, iode, fruits secs, bois, épices et longue finale maritime.`,

      anecdote:
        `L'île d'Islay est particulièrement célèbre pour ses whiskies tourbés et maritimes.`,

      service_notes:
        `Servir pur. Quelques gouttes d'eau peuvent ouvrir les arômes.`,
    }
  }

  /*
  GLENMORANGIE
  */
  if (
    includesAny(
      name,
      'Glenmorangie Original'
    )
  ) {
    return {
      description:
        `Glenmorangie Original est un single malt des Highlands souple, floral et fruité.`,

      history:
        `Glenmorangie est une distillerie écossaise des Highlands réputée notamment pour ses très hauts alambics.`,

      production_method:
        `Single malt distillé dans de hauts alambics en cuivre puis élevé principalement en fûts de chêne.`,

      aromatic_profile:
        `Agrumes, pêche, fleurs, vanille, miel et épices légères.`,

      anecdote:
        `Les alambics de Glenmorangie figurent parmi les plus hauts utilisés dans l'industrie du Scotch whisky.`,

      service_notes:
        `Pur, quelques gouttes d'eau ou Highball.`,
    }
  }

  /*
  NIKKA
  */
  if (
    includesAny(
      name,
      'Nikka From The Barrel'
    )
  ) {
    return {
      description:
        `Nikka From The Barrel est un whisky japonais d'assemblage intense et concentré.`,

      history:
        `Nikka a été fondée par Masataka Taketsuru, figure majeure de l'histoire du whisky japonais.`,

      production_method:
        `Assemblage de whiskies de malt et de grain puis mariage avant embouteillage.`,

      aromatic_profile:
        `Fruits mûrs, épices, caramel, orange, bois et finale chaleureuse.`,

      anecdote:
        `Sa petite bouteille carrée est devenue immédiatement reconnaissable.`,

      service_notes:
        `Pur, avec eau, sur gros glaçon ou en Highball.`,
    }
  }

  /*
  BUFFALO TRACE
  */
  if (
    includesAny(
      name,
      'Buffalo Trace'
    )
  ) {
    return {
      description:
        `Buffalo Trace est un bourbon du Kentucky équilibré, gourmand et épicé.`,

      history:
        `Il est produit à Frankfort dans l'une des distilleries historiques du Kentucky.`,

      production_method:
        `Whiskey élaboré avec une majorité de maïs puis vieilli en fûts de chêne neufs carbonisés.`,

      aromatic_profile:
        `Vanille, caramel, maïs doux, épices, chêne et fruits mûrs.`,

      anecdote:
        `Un bourbon doit notamment contenir au moins 51 % de maïs et être vieilli en fûts de chêne neufs carbonisés.`,

      service_notes:
        `Old Fashioned, Whiskey Sour, Manhattan ou pur.`,
    }
  }

  /*
  JACK DANIEL'S
  */
  if (
    includesAny(
      name,
      'Jack Daniels',
      "Jack Daniel's"
    )
  ) {
    return {
      description:
        `Jack Daniel's est un Tennessee Whiskey souple marqué par vanille, caramel et bois.`,

      history:
        `Il est produit à Lynchburg dans le Tennessee et fait partie des whiskeys américains les plus connus.`,

      production_method:
        `Whiskey filtré lentement sur charbon de bois d'érable avant vieillissement en fûts de chêne neufs carbonisés.`,

      aromatic_profile:
        `Caramel, vanille, banane, céréales, chêne et épices douces.`,

      anecdote:
        `La filtration sur charbon avant vieillissement est connue sous le nom de Lincoln County Process.`,

      service_notes:
        `Pur, sur glace, Highball ou cocktails classiques au whiskey.`,
    }
  }

  /*
  COINTREAU
  */
  if (
    includesAny(
      name,
      'Cointreau'
    )
  ) {
    return {
      description:
        `Cointreau est une liqueur française d'orange claire, intense et relativement sèche.`,

      history:
        `Cointreau est née à Angers au XIXe siècle et est devenue une référence internationale de la liqueur d'orange.`,

      production_method:
        `Distillation d'écorces d'oranges douces et amères puis assemblage avec alcool, eau et sucre.`,

      aromatic_profile:
        `Orange fraîche, zestes, fleurs blanches et épices légères.`,

      anecdote:
        `Cointreau est un ingrédient majeur de la Margarita, du Sidecar et du Cosmopolitan.`,

      service_notes:
        `Doser précisément car la liqueur apporte simultanément alcool, sucre et aromatique.`,
    }
  }

  /*
  GRAND MARNIER
  */
  if (
    includesAny(
      name,
      'Grand Marnier'
    )
  ) {
    return {
      description:
        `Grand Marnier est une liqueur française d'orange associant agrumes et profondeur d'un spiritueux de type cognac.`,

      history:
        `Grand Marnier est une maison française historique dont la célèbre liqueur d'orange remonte au XIXe siècle.`,

      production_method:
        `Assemblage d'essence d'orange amère avec une base de cognac puis maturation et assemblage.`,

      aromatic_profile:
        `Orange confite, zeste, vanille, caramel, bois et épices.`,

      anecdote:
        `Sa base de cognac lui apporte davantage de profondeur qu'un triple sec classique.`,

      service_notes:
        `Margarita premium, Sidecar, desserts ou service pur.`,
    }
  }

  /*
  KAHLUA
  */
  if (
    includesAny(
      name,
      'Kahlua',
      'Kahlúa'
    )
  ) {
    return {
      description:
        `Kahlúa est une liqueur de café mexicaine douce et gourmande.`,

      history:
        `Originaire du Mexique, Kahlúa est devenue l'une des liqueurs de café les plus connues au monde.`,

      production_method:
        `Liqueur élaborée autour du café, du sucre et d'une base alcoolisée.`,

      aromatic_profile:
        `Café torréfié, caramel, vanille, cacao et douceur persistante.`,

      anecdote:
        `Kahlúa est notamment utilisée dans le White Russian et le Black Russian.`,

      service_notes:
        `Attention au niveau de sucre lors de la construction du cocktail.`,
    }
  }

  /*
  BAILEYS
  */
  if (
    includesAny(
      name,
      'Bailey',
      'Baileys'
    )
  ) {
    return {
      description:
        `Baileys est une liqueur irlandaise crémeuse associant crème, whiskey irlandais et notes chocolatées.`,

      history:
        `Baileys Original Irish Cream a été lancé dans les années 1970 et a fortement popularisé les cream liqueurs.`,

      production_method:
        `Assemblage de crème, spiritueux ou whiskey irlandais, sucre et arômes.`,

      aromatic_profile:
        `Crème, cacao, vanille, caramel et whiskey doux.`,

      anecdote:
        `Un ingrédient très acide peut faire cailler une liqueur contenant de la crème.`,

      service_notes:
        `Mudslide, cocktails dessert, café ou service sur glace.`,
    }
  }

  /*
  CAMPARI
  */
  if (
    includesAny(
      name,
      'Campari'
    )
  ) {
    return {
      description:
        `Campari est un amer italien rouge, intense et complexe, emblématique de l'aperitivo.`,

      history:
        `Campari est né en Italie au XIXe siècle et est devenu un ingrédient essentiel de nombreux cocktails classiques.`,

      production_method:
        `Infusion et extraction d'un assemblage confidentiel de plantes, fruits et aromates.`,

      aromatic_profile:
        `Orange amère, herbes, racines, épices et amertume persistante.`,

      anecdote:
        `Negroni, Americano et Boulevardier utilisent tous Campari.`,

      service_notes:
        `Équilibrer son amertume avec vermouth, spiritueux, agrumes ou soda.`,
    }
  }

  /*
  ST-GERMAIN
  */
  if (
    includesAny(
      name,
      'St Germain',
      'Saint Germain'
    )
  ) {
    return {
      description:
        `St-Germain est une liqueur française florale à base de fleurs de sureau.`,

      history:
        `La marque a fortement contribué à populariser la fleur de sureau dans le cocktail contemporain.`,

      production_method:
        `Liqueur élaborée à partir de fleurs de sureau, d'une base alcoolisée et de sucre.`,

      aromatic_profile:
        `Fleur de sureau, poire, agrumes, fruits blancs et notes miellées.`,

      anecdote:
        `Une petite quantité suffit généralement pour donner une signature florale très reconnaissable.`,

      service_notes:
        `Très efficace avec Champagne, gin, vodka, agrumes et soda.`,
    }
  }

  /*
  FERNET
  */
  if (
    includesAny(
      name,
      'Fernet Branca'
    )
  ) {
    return {
      description:
        `Fernet-Branca est un amaro italien très amer, herbacé et mentholé.`,

      history:
        `Fernet-Branca est l'une des références historiques de la famille des fernet italiens.`,

      production_method:
        `Macération et assemblage de nombreuses plantes, racines et épices puis maturation.`,

      aromatic_profile:
        `Herbes amères, menthe, réglisse, racines, épices et notes médicinales.`,

      anecdote:
        `En Argentine, le mélange Fernet et cola est devenu extrêmement populaire.`,

      service_notes:
        `Digestif, Fernet & Cola ou petites touches dans des cocktails amers.`,
    }
  }

  return null
}

/*
=========================================================
SPIRITUEUX PAR CATÉGORIE
=========================================================
*/

function genericSpiritSheet(
  product
) {
  const name =
    cleanProductName(
      product.name
    )

  const sub =
    normalize(
      product.subcategory
    )

  /*
  GIN
  */
  if (
    sub.includes(
      'gin'
    )
  ) {
    return {
      description:
        `${name} est un gin de la sélection NukuStock destiné au service Bar Team.`,

      history:
        `L'histoire spécifique de ${name} doit être complétée à partir de la documentation officielle de la distillerie.`,

      production_method:
        `Spiritueux aromatisé où le genièvre constitue un marqueur essentiel. Les autres botaniques et la méthode de distillation varient selon la marque.`,

      aromatic_profile:
        `Genièvre, agrumes, herbes, fleurs et épices selon la recette.`,

      anecdote:
        `Le genièvre constitue la signature aromatique fondamentale de la catégorie gin.`,

      service_notes:
        `Gin & Tonic, Martini ou cocktails classiques. Adapter garnish et tonic au profil du gin.`,
    }
  }

  /*
  VODKA
  */
  if (
    sub.includes(
      'vodka'
    )
  ) {
    return {
      description:
        `${name} est une vodka de la sélection NukuStock.`,

      history:
        `L'histoire spécifique de la marque doit être complétée à partir de sa documentation officielle.`,

      production_method:
        `Spiritueux distillé à partir d'une matière première fermentée puis rectifié et ajusté avec de l'eau.`,

      aromatic_profile:
        `Profil généralement net avec des nuances de céréales, poivre, agrumes ou texture selon la matière première.`,

      anecdote:
        `Une vodka n'est pas obligatoirement totalement neutre : sa matière première et sa distillation peuvent apporter texture et caractère.`,

      service_notes:
        `Servir très frais, pur ou en cocktail.`,
    }
  }

  /*
  TEQUILA
  */
  if (
    sub.includes(
      'tequila'
    )
  ) {
    return {
      description:
        `${name} est une tequila mexicaine élaborée à partir d'agave bleu Weber.`,

      history:
        `La tequila est un spiritueux protégé par une appellation géographique mexicaine.`,

      production_method:
        `Cuisson des agaves, extraction des sucres, fermentation puis distillation. Un vieillissement en fût peut ensuite être réalisé selon la catégorie.`,

      aromatic_profile:
        `Agave cuit, agrumes, poivre, herbes et éventuelles notes de vanille et de chêne.`,

      anecdote:
        `L'agave est une plante succulente et non un cactus.`,

      service_notes:
        `Margarita, Paloma, cocktails d'agave ou dégustation pure.`,
    }
  }

  /*
  MEZCAL
  */
  if (
    sub.includes(
      'mezcal'
    )
  ) {
    return {
      description:
        `${name} est un mezcal mexicain élaboré à partir d'agave.`,

      history:
        `Le mezcal regroupe une grande diversité de traditions, de régions et de variétés d'agave.`,

      production_method:
        `Les méthodes artisanales peuvent comprendre cuisson des agaves en fosse, broyage, fermentation puis distillation.`,

      aromatic_profile:
        `Agave rôti, fumée, herbes, terre, fruits et minéralité.`,

      anecdote:
        `Tous les mezcals ne sont pas fortement fumés : le profil dépend beaucoup de l'agave et de la méthode de production.`,

      service_notes:
        `Servir pur ou utiliser dans des cocktails où le caractère de l'agave reste présent.`,
    }
  }

  /*
  RHUM AGRICOLE
  */
  if (
    sub.includes(
      'rhum agricol'
    )
  ) {
    return {
      description:
        `${name} est un rhum agricole élaboré à partir de jus frais de canne.`,

      history:
        `Le rhum agricole est historiquement associé aux Antilles françaises et à d'autres territoires producteurs de canne.`,

      production_method:
        `Jus frais de canne fermenté puis distillé, avec éventuel vieillissement en fût.`,

      aromatic_profile:
        `Canne fraîche, végétal, fleurs, agrumes, épices et notes boisées selon l'âge.`,

      anecdote:
        `Le rhum agricole utilise le jus de canne directement, contrairement au rhum traditionnel de mélasse.`,

      service_notes:
        `Ti' Punch, Daiquiri ou dégustation pure.`,
    }
  }

  /*
  RHUM INDUSTRIEL / MÉLASSE
  */
  if (
    sub.includes(
      'rhum industriel'
    )
  ) {
    return {
      description:
        `${name} est un rhum de mélasse de la sélection NukuStock.`,

      history:
        `La majorité des grands styles internationaux de rhum utilisent la mélasse issue de la production de sucre.`,

      production_method:
        `Mélasse fermentée puis distillée. Le rhum peut ensuite être filtré, assemblé et/ou vieilli.`,

      aromatic_profile:
        `Canne, vanille, caramel, fruits et épices selon le style et le vieillissement.`,

      anecdote:
        `La mélasse est un coproduit concentré obtenu lors de la fabrication du sucre de canne.`,

      service_notes:
        `Cocktails classiques ou tropicaux ; les expressions âgées peuvent être dégustées pures.`,
    }
  }

  /*
  CACHAÇA
  */
  if (
    sub.includes(
      'cachaca'
    )
  ) {
    return {
      description:
        `${name} est une cachaça brésilienne élaborée à partir de jus frais de canne.`,

      history:
        `La cachaça est le spiritueux emblématique du Brésil.`,

      production_method:
        `Fermentation du jus frais de canne puis distillation.`,

      aromatic_profile:
        `Canne fraîche, végétal, fruits, fleurs et notes fermentaires.`,

      anecdote:
        `La cachaça est la base traditionnelle de la Caipirinha.`,

      service_notes:
        `Caipirinha ou dégustation pure.`,
    }
  }

  /*
  COGNAC
  */
  if (
    sub.includes(
      'cognac'
    )
  ) {
    return {
      description:
        `${name} est un Cognac, eau-de-vie de vin française bénéficiant d'une appellation protégée.`,

      history:
        `Le Cognac est produit dans une région délimitée autour de la ville de Cognac, dans l'ouest de la France.`,

      production_method:
        `Vin blanc distillé puis eau-de-vie vieillie en fûts de chêne avant assemblage.`,

      aromatic_profile:
        `Fruits, fleurs, vanille, épices, fruits secs et bois.`,

      anecdote:
        `VS, VSOP et XO correspondent à des catégories réglementées basées sur l'âge minimum des eaux-de-vie de l'assemblage.`,

      service_notes:
        `Dégustation pure ou cocktails classiques selon la catégorie.`,
    }
  }

  /*
  ARMAGNAC
  */
  if (
    sub.includes(
      'armagnac'
    )
  ) {
    return {
      description:
        `${name} est un Armagnac, eau-de-vie de vin historique du Sud-Ouest de la France.`,

      history:
        `L'Armagnac compte parmi les plus anciennes eaux-de-vie de vin françaises.`,

      production_method:
        `Vin distillé puis eau-de-vie vieillie en fûts de chêne.`,

      aromatic_profile:
        `Prune, fruits secs, épices, vanille, bois et notes de rancio avec l'âge.`,

      anecdote:
        `L'Armagnac est historiquement plus ancien que le Cognac.`,

      service_notes:
        `Servir pur à température modérée.`,
    }
  }

  /*
  CALVADOS
  */
  if (
    sub.includes(
      'calvados'
    )
  ) {
    return {
      description:
        `${name} est un Calvados, eau-de-vie normande issue principalement de pommes.`,

      history:
        `Le Calvados est produit en Normandie à partir de cidre distillé.`,

      production_method:
        `Fermentation de pommes et parfois poires en cidre, distillation puis vieillissement en fûts.`,

      aromatic_profile:
        `Pomme, poire, épices, caramel, vanille et bois.`,

      anecdote:
        `Le Calvados est une eau-de-vie de cidre et non une eau-de-vie de raisin.`,

      service_notes:
        `Pur ou dans des cocktails mettant en avant la pomme.`,
    }
  }

  /*
  WHISKY SCOTCH
  */
  if (
    sub.includes(
      'whisky scotch'
    )
  ) {
    return {
      description:
        `${name} est un Scotch whisky produit en Écosse.`,

      history:
        `L'Écosse possède plusieurs grandes régions de production de whisky, chacune regroupant des styles très variés.`,

      production_method:
        `Whisky distillé puis vieilli en fûts de chêne conformément à la réglementation du Scotch Whisky.`,

      aromatic_profile:
        `Malt, fruits, vanille, épices, bois et éventuellement tourbe ou fumée.`,

      anecdote:
        `Islay, Speyside et Highlands sont des repères géographiques utiles mais ne suffisent pas à résumer le style d'une distillerie.`,

      service_notes:
        `Pur, avec quelques gouttes d'eau, sur glace ou en Highball.`,
    }
  }

  /*
  BOURBON
  */
  if (
    sub.includes(
      'bourbon'
    )
  ) {
    return {
      description:
        `${name} est un bourbon américain.`,

      history:
        `Le bourbon est l'une des grandes catégories historiques du whiskey américain.`,

      production_method:
        `Mash contenant au minimum 51 % de maïs puis vieillissement en fûts de chêne neufs carbonisés.`,

      aromatic_profile:
        `Vanille, caramel, maïs doux, chêne et épices.`,

      anecdote:
        `Le bourbon n'est pas obligé d'être produit au Kentucky : il doit être produit aux États-Unis et respecter les règles de la catégorie.`,

      service_notes:
        `Old Fashioned, Whiskey Sour, Manhattan ou pur.`,
    }
  }

  /*
  WHISKY JAPONAIS
  */
  if (
    sub.includes(
      'japon'
    )
  ) {
    return {
      description:
        `${name} est un whisky japonais de la sélection NukuStock.`,

      history:
        `Le développement du whisky japonais moderne est fortement lié au savoir-faire écossais adapté au Japon au XXe siècle.`,

      production_method:
        `Whisky de malt et/ou de grain distillé, vieilli puis assemblé selon le style de la maison.`,

      aromatic_profile:
        `Fruits, céréales, épices, bois et profil généralement précis et équilibré.`,

      anecdote:
        `Le Highball est l'un des services les plus emblématiques du whisky au Japon.`,

      service_notes:
        `Pur, avec eau ou en Highball japonais.`,
    }
  }

  /*
  WHISKY AMÉRICAIN / CANADIEN
  */
  if (
    sub.includes(
      'whisky americain'
    ) ||
    sub.includes(
      'whiskey americain'
    ) ||
    sub.includes(
      'whiskey canadien'
    )
  ) {
    return {
      description:
        `${name} est un whiskey nord-américain de la sélection NukuStock.`,

      history:
        `Les traditions américaines et canadiennes utilisent différents assemblages de céréales et méthodes de vieillissement.`,

      production_method:
        `Céréales fermentées, distillées puis vieillies en fûts.`,

      aromatic_profile:
        `Céréales, vanille, caramel, épices et chêne.`,

      anecdote:
        `Le grain dominant du mash — maïs, seigle ou blé — peut modifier fortement le style du whiskey.`,

      service_notes:
        `Pur, Highball ou cocktails classiques au whiskey.`,
    }
  }

  /*
  LIQUEUR
  */
  if (
    sub.includes(
      'liqueur'
    ) ||
    sub.includes(
      'chartreuse'
    ) ||
    sub.includes(
      'digestif'
    )
  ) {
    return {
      description:
        `${name} est une liqueur ou un spiritueux aromatisé de la sélection NukuStock.`,

      history:
        `L'histoire et la recette spécifique doivent être complétées à partir des informations officielles du producteur.`,

      production_method:
        `Aromatisation d'une base alcoolisée avec fruits, plantes, épices, café ou autres ingrédients, puis ajout éventuel de sucre.`,

      aromatic_profile:
        `Profil concentré correspondant aux ingrédients principaux de la liqueur.`,

      anecdote:
        `Une liqueur apporte souvent simultanément arôme, sucre, couleur et texture à un cocktail.`,

      service_notes:
        `Doser précisément afin de conserver l'équilibre sucre / alcool / acidité.`,
    }
  }

  /*
  APÉRITIF
  */
  if (
    sub.includes(
      'aperitif'
    )
  ) {
    return {
      description:
        `${name} est un apéritif de la sélection NukuStock.`,

      history:
        `La culture de l'apéritif est particulièrement développée en France et en Italie.`,

      production_method:
        `Base de vin et/ou de spiritueux aromatisée avec plantes, fruits ou épices selon la référence.`,

      aromatic_profile:
        `Herbes, agrumes, épices, fruits et amertume variable.`,

      anecdote:
        `Traditionnellement, les boissons apéritives sont destinées à stimuler l'appétit avant le repas.`,

      service_notes:
        `Servir frais, sur glace ou dans les cocktails classiques.`,
    }
  }

  /*
  ANISÉ
  */
  if (
    sub.includes(
      'anise'
    )
  ) {
    return {
      description:
        `${name} est un spiritueux anisé.`,

      history:
        `Les boissons anisées font partie de la tradition méditerranéenne de l'apéritif.`,

      production_method:
        `Base alcoolisée aromatisée à l'anis et à différentes plantes selon la recette.`,

      aromatic_profile:
        `Anis, réglisse, herbes et épices.`,

      anecdote:
        `L'ajout d'eau peut rendre la boisson trouble : c'est l'effet de louche provoqué par les huiles essentielles d'anis.`,

      service_notes:
        `Servir traditionnellement allongé d'eau fraîche.`,
    }
  }

  /*
  EAU-DE-VIE
  */
  if (
    sub.includes(
      'eau de vie'
    )
  ) {
    return {
      description:
        `${name} est une eau-de-vie obtenue par distillation d'une matière première fermentée.`,

      history:
        `Les eaux-de-vie permettent de concentrer les arômes d'un fruit, d'un vin ou d'une autre matière première fermentée.`,

      production_method:
        `Fermentation puis distillation de la matière première.`,

      aromatic_profile:
        `Fruit, fleurs, épices et chaleur alcoolique selon l'origine.`,

      anecdote:
        `Le terme eau-de-vie désigne une très grande famille de spiritueux.`,

      service_notes:
        `Servir en petite quantité, généralement pure.`,
    }
  }

  /*
  HYDROMEL
  */
  if (
    sub.includes(
      'hydromel'
    )
  ) {
    return {
      description:
        `${name} est une boisson fermentée élaborée à partir de miel.`,

      history:
        `L'hydromel compte parmi les plus anciennes boissons fermentées connues.`,

      production_method:
        `Fermentation d'un mélange d'eau et de miel.`,

      aromatic_profile:
        `Miel, fleurs, fruits et notes fermentaires.`,

      anecdote:
        `L'hydromel est parfois surnommé « vin de miel », même s'il n'est pas élaboré à partir de raisin.`,

      service_notes:
        `Servir frais ou tempéré selon le style.`,
    }
  }

  /*
  CIDRE
  */
  if (
    sub.includes(
      'cidre'
    )
  ) {
    return {
      description:
        `${name} est un cidre élaboré à partir de pommes fermentées.`,

      history:
        `Le cidre est historiquement associé à plusieurs régions productrices de pommes, notamment la Normandie et la Bretagne.`,

      production_method:
        `Pressurage des pommes puis fermentation du jus.`,

      aromatic_profile:
        `Pomme fraîche, pomme mûre, notes fermentaires et douceur variable.`,

      anecdote:
        `Le cidre peut aller du doux au brut selon le niveau de sucres résiduels.`,

      service_notes:
        `Servir frais.`,
    }
  }

  /*
  GÉNÉRIQUE ALCOOL
  */
  return {
    description:
      `${name} est une référence de la sélection spiritueux NukuStock.`,

    history:
      `L'histoire spécifique de cette référence doit être complétée à partir de la documentation officielle du producteur.`,

    production_method:
      `Méthode de fabrication à confirmer selon le produit et le producteur.`,

    aromatic_profile:
      `Profil aromatique à compléter à partir de la dégustation et de la fiche technique officielle.`,

    anecdote:
      `Informations complémentaires à vérifier auprès du producteur.`,

    service_notes:
      `Respecter le standard de service Bar Team et la verrerie adaptée.`,
  }
}

/*
=========================================================
CONSTRUCTION DE LA FICHE
=========================================================
*/

function buildSheet(
  product
) {
  const category =
    normalize(
      product.category
    )

  /*
  SPÉCIFIQUE D'ABORD
  */
  if (
    category ===
    'alcools'
  ) {
    const specific =
      specificSpiritSheet(
        product
      )

    if (specific) {
      return specific
    }
  }

  /*
  CATÉGORIES
  */
  if (
    category === 'vins'
  ) {
    return wineSheet(
      product
    )
  }

  if (
    category ===
    'champagnes'
  ) {
    return champagneSheet(
      product
    )
  }

  if (
    category ===
    'bieres'
  ) {
    return beerSheet(
      product
    )
  }

  if (
    category ===
    'soft drinks'
  ) {
    return softSheet(
      product
    )
  }

  if (
    category ===
    'alcools'
  ) {
    return genericSpiritSheet(
      product
    )
  }

  const name =
    cleanProductName(
      product.name
    )

  return {
    description:
      `${name} est une référence de la sélection NukuStock.`,

    history:
      `Histoire de la référence à compléter.`,

    production_method:
      `Méthode de fabrication à compléter.`,

    aromatic_profile:
      `Profil aromatique à compléter.`,

    anecdote:
      `Anecdote à compléter.`,

    service_notes:
      `Respecter les standards de service Bar Team.`,
  }
}

/*
=========================================================
CHARGEMENT DES PRODUITS NUKUSTOCK
=========================================================
*/

console.log('')
console.log(
  '========================================'
)

console.log(
  'NUKUSTOCK — FICHES PRODUITS BAR TEAM'
)

console.log(
  '========================================'
)

console.log('')
console.log(
  'Chargement des produits...'
)

const {
  data:
    products,

  error:
    productError,
} =
  await admin
    .from(
      'products'
    )
    .select(
      `
      id,
      internal_reference,
      supplier_reference,
      name,
      category,
      subcategory,
      brand,
      packaging,
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

if (
  productError
) {
  throw productError
}

console.log(
  `${products?.length || 0} produits actifs trouvés.`
)

/*
=========================================================
CHARGEMENT DES FICHES EXISTANTES
=========================================================
*/

console.log('')
console.log(
  'Chargement des fiches existantes...'
)

const {
  data:
    existingSheets,

  error:
    sheetsError,
} =
  await admin
    .from(
      'bar_product_sheets'
    )
    .select(
      `
      product_id,
      description,
      history,
      production_method,
      aromatic_profile,
      anecdote,
      service_notes
      `
    )

if (
  sheetsError
) {
  throw sheetsError
}

const existingByProduct =
  new Map(
    (
      existingSheets ||
      []
    ).map(
      row => [
        row.product_id,
        row,
      ]
    )
  )

/*
=========================================================
COMPTEURS
=========================================================
*/

let created =
  0

let completed =
  0

let alreadyComplete =
  0

let errors =
  0

/*
=========================================================
TRAITEMENT
=========================================================
*/

console.log('')
console.log(
  'Enrichissement...'
)

console.log('')

for (
  const product
  of products || []
) {
  const generated =
    buildSheet(
      product
    )

  const current =
    existingByProduct.get(
      product.id
    )

  /*
  IMPORTANT :

  Si Jonathan ou Emma ont déjà écrit
  quelque chose dans un champ,
  ON LE CONSERVE.

  On complète uniquement les
  champs vides.
  */

  const payload = {
    product_id:
      product.id,

    description:
      current
        ?.description
        ?.trim()
        ? current.description
        : generated.description,

    history:
      current
        ?.history
        ?.trim()
        ? current.history
        : generated.history,

    production_method:
      current
        ?.production_method
        ?.trim()
        ? current.production_method
        : generated
            .production_method,

    aromatic_profile:
      current
        ?.aromatic_profile
        ?.trim()
        ? current
            .aromatic_profile
        : generated
            .aromatic_profile,

    anecdote:
      current
        ?.anecdote
        ?.trim()
        ? current.anecdote
        : generated.anecdote,

    service_notes:
      current
        ?.service_notes
        ?.trim()
        ? current
            .service_notes
        : generated
            .service_notes,

    updated_at:
      new Date()
        .toISOString(),
  }

  const complete =
    current &&
    current
      .description
      ?.trim() &&
    current
      .history
      ?.trim() &&
    current
      .production_method
      ?.trim() &&
    current
      .aromatic_profile
      ?.trim() &&
    current
      .anecdote
      ?.trim() &&
    current
      .service_notes
      ?.trim()

  if (
    complete
  ) {
    alreadyComplete +=
      1

    console.log(
      `DÉJÀ COMPLET : ${product.name}`
    )

    continue
  }

  const {
    error:
      saveError,
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

  if (
    saveError
  ) {
    errors +=
      1

    console.error(
      `ERREUR : ${product.name}`
    )

    console.error(
      saveError.message
    )

    continue
  }

  if (
    current
  ) {
    completed +=
      1

    console.log(
      `COMPLÉTÉ : ${product.name}`
    )
  } else {
    created +=
      1

    console.log(
      `CRÉÉ : ${product.name}`
    )
  }
}

/*
=========================================================
RÉSULTAT FINAL
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
  `Fiches créées : ${created}`
)

console.log(
  `Fiches complétées : ${completed}`
)

console.log(
  `Fiches déjà complètes : ${alreadyComplete}`
)

console.log(
  `Erreurs : ${errors}`
)

console.log(
  '========================================'
)

console.log('')

if (
  errors > 0
) {
  console.log(
    'Certaines fiches ont rencontré une erreur. Regarde les lignes ERREUR ci-dessus.'
  )
} else {
  console.log(
    'SUCCÈS — Toutes les fiches produits ont été traitées.'
  )
}

console.log('')