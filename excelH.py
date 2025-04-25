import pandas as pd
import numpy as np
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, NamedStyle

# --- Préférences utilisateur pour le formatage (en-FR) ---
CURRENCY_SYMBOL = "€"
DECIMAL_SEPARATOR = ","
GROUPING_SEPARATOR = " " # Espace insécable, souvent affiché comme un espace normal
DATE_FORMAT = "DD/MM/YYYY" # Pas directement utilisé dans le modèle, mais bon à noter

# Style pour les en-têtes de tableau
header_style = NamedStyle(name="header_style")
header_style.font = Font(bold=True)
header_style.fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid") # Gris clair
header_style.alignment = Alignment(horizontal="center", vertical="center")
header_style.border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

# Style pour les valeurs monétaires
currency_style = NamedStyle(name="currency_style")
currency_style.number_format = f'#,##0{DECIMAL_SEPARATOR}00 {CURRENCY_SYMBOL}' # Format monétaire avec 2 décimales
currency_style.font = Font()
currency_style.alignment = Alignment(horizontal="right", vertical="center")

# Style pour les pourcentages
percent_style = NamedStyle(name="percent_style")
percent_style.number_format = f'0{DECIMAL_SEPARATOR}00%'
percent_style.font = Font()
percent_style.alignment = Alignment(horizontal="right", vertical="center")

# Style pour les nombres entiers
integer_style = NamedStyle(name="integer_style")
integer_style.number_format = '#,##0'
integer_style.font = Font()
integer_style.alignment = Alignment(horizontal="right", vertical="center")


# --- Hypothèses du Modèle (À TWEAKER dans l'onglet 'Inputs') ---
# Années de projection (FY = Fiscal Year)
model_years = [2026, 2027, 2028, 2029, 2030]
num_years = len(model_years)

# 1. Hypothèses de Marché (TAM/SAM/SOM)
tam_global_2030_eur_bn = 60 # TAM révisé (Mondial, estimé)
sam_europe_eur_bn = 5    # SAM révisé (Europe)
sam_breakdown_pct = {'France': 0.2, 'Germany': 0.25, 'Other EU': 0.55} # Répartition du SAM européen

# Nombre estimé d'entreprises cible par segment en France (Approximation)
# Basé sur les données du document (ex: ~10-15K entities NIS2 France, 1030 clinics, 86K Legal/Acc)
# On se concentre sur les cibles pertinentes pour nos tiers (Medium/Large IE, EE, + certains Adjacents)
targetable_companies_france = {
    'EE_Sante': 500, # Estimation d'entités EE Santé significatives en France
    'EE_Finance': 400, # Estimation d'entités EE Finance significatives en France
    'EE_ICT_Infra': 800, # Estimation d'entités EE ICT/Infra significatives en France
    'IE_Prioritaires': 5000, # Estimation d'IE prioritaires impactées par NIS2 en France
    'Adj_Legal': 10000, # Estimation de cabinets Juridiques/Notaires/etc. significatifs en France
    'Adj_SupplyChain': 5000, # Estimation d'acteurs Supply Chain significatifs en France
    'Adj_Fintech': 1000, # Estimation d'acteurs Fintech B2B significatifs en France
}
# Simplification: On peut projeter les autres géographies EU en proportion du SAM
targetable_companies_germany = {k: v * (sam_breakdown_pct['Germany'] / sam_breakdown_pct['France']) for k, v in targetable_companies_france.items()}
targetable_companies_other_eu = {k: v * (sam_breakdown_pct['Other EU'] / sam_breakdown_pct['France']) for k, v in targetable_companies_france.items()}
targetable_companies_eu = {k: targetable_companies_france[k] + targetable_companies_germany[k] + targetable_companies_other_eu[k] for k in targetable_companies_france.keys()}


# 2. Hypothèses de Tarification (ARPC - Annual Recurring Revenue Per Customer)
# Prix annuels moyens par tier (à TWEAKER)
arpc_tiers = {
    'Essentials': 5000,   # Prix moyen annuel pour le tier Essentials
    'Business Pro': 20000, # Prix moyen annuel pour le tier Business Pro
    'Enterprise': 60000   # Prix moyen annuel pour le tier Enterprise (renommé de Secure)
}

# 3. Hypothèses d'Acquisition et Rétention Client
# Nombre cible de NOUVEAUX clients acquis par année (À TWEAKER)
# Basé sur la Roadmap ajustée (ex: 40-50 en Y1, 130-150 en Y2, etc.)
new_customers_per_year = {
    2026: 45,
    2027: 140,
    2028: 250,
    2029: 325,
    2030: 375
}

# Répartition des NOUVEAUX clients par tier et par année (À TWEAKER - doit sommer à 1 pour chaque année)
# Basé sur le ciblage segmentaire (EE plutôt Enterprise/Pro, IE/Adj plutôt Essentials/Pro)
new_customer_tier_split_pct = {
    2026: {'Essentials': 0.10, 'Business Pro': 0.40, 'Enterprise': 0.50}, # Forte concentration EE initialement
    2027: {'Essentials': 0.15, 'Business Pro': 0.45, 'Enterprise': 0.40}, # Effet NIS2 sur plus d'IE/petites EE
    2028: {'Essentials': 0.20, 'Business Pro': 0.40, 'Enterprise': 0.40}, # Entrée marchés adjacents plus larges
    2029: {'Essentials': 0.25, 'Business Pro': 0.40, 'Enterprise': 0.35}, # Expansion UE et adjacents divers
    2030: {'Essentials': 0.30, 'Business Pro': 0.35, 'Enterprise': 0.35}  # Diversification des segments clients
}

# Taux de Churn annuel par tier (À TWEAKER - en %)
churn_rate_pct = {'Essentials': 0.15, 'Business Pro': 0.10, 'Enterprise': 0.08} # Le churn est généralement plus bas pour les gros clients

# Taux d'Expansion annuel par tier (NRR > 100% si Expansion > Churn) (À TWEAKER - en %)
# L'expansion vient de l'upsell (plus d'utilisateurs/volume) et du cross-sell (modules additionnels)
expansion_rate_pct = {'Essentials': 0.05, 'Business Pro': 0.15, 'Enterprise': 0.25} # Plus de potentiel d'expansion sur les gros comptes

# 4. Hypothèses de Coûts (Simplifié)
# COGS (Cost of Goods Sold) comme % du revenu (hébergement, support de base)
cogs_pct = 0.10 # 10% des revenus

# Dépenses Opérationnelles (OpEx) - Montants absolus annuels (À TWEAKER)
# Basé sur les projections du pitch deck ajusté
opex_annual = {
    2026: {'S&M': 1200000, 'R&D': 1700000, 'G&A': 600000}, # Y1: 2.9M OpEx
    2027: {'S&M': 2500000, 'R&D': 2200000, 'G&A': 800000}, # Y2: 5.5M OpEx
    2028: {'S&M': 3600000, 'R&D': 2700000, 'G&A': 1200000},# Y3: 7.5M OpEx (Pitch Y3 OpEx était 6.5M, ajusté pour ambition)
    2029: {'S&M': 5400000, 'R&D': 3600000, 'G&A': 1800000},# Y4: 10.8M OpEx (Pitch Y4 OpEx était 9.8M, ajusté)
    2030: {'S&M': 8400000, 'R&D': 4800000, 'G&A': 2400000},# Y5: 15.6M OpEx (Pitch Y5 OpEx était 13.5M, ajusté)
}
# Vérification rapide des totaux OpEx : 2.9 + 5.5 + 7.5 + 10.8 + 15.6 = 42.3M (proche 42.8M dans pitch révisé) - OK

# --- Calculs du Modèle ---

# Initialisation des DataFrames
# df_customers: Suivi des clients par cohorte et par année, par tier
# Colonnes multi-niveaux: Année | Tier (Essentials, Pro, Enterprise)
# Index: Année d'acquisition (Cohort Year)
cohort_years = model_years
customer_tiers = list(arpc_tiers.keys())
customer_cols = pd.MultiIndex.from_product([model_years, customer_tiers], names=['Year', 'Tier'])
df_customers = pd.DataFrame(0.0, index=cohort_years, columns=customer_cols) # Stocke les clients RESTANTS de cette cohorte dans l'année

# df_revenue: Suivi du revenu par cohorte et par année, par tier
df_revenue = pd.DataFrame(0.0, index=cohort_years, columns=customer_cols) # Stocke le revenu généré par les clients RESTANTS de cette cohorte dans l'année

# df_financials: Résumé P&L et métriques clés par année
financial_rows = ['Revenue', 'COGS', 'Gross Profit', 'Total OpEx', 'EBITDA',
                  'Gross Margin (%)', 'EBITDA Margin (%)', 'Customers (Start Year)', 'New Customers', 'Retained Customers', 'Customers (End Year)',
                  'ARPC (Overall)', 'CAC (Overall)', 'CAC Payback (Months)', 'LTV (Overall)', 'LTV:CAC Ratio', 'NRR (Overall)']
df_financials = pd.DataFrame(0.0, index=financial_rows, columns=model_years)

# --- Simulation Année par Année ---

customers_end_prev_year_by_tier = {tier: 0 for tier in customer_tiers} # Clients à la fin de l'année précédente, par tier

for year in model_years:
    # Calcul des Nouveaux Clients et répartition par tier
    num_new_customers = new_customers_per_year.get(year, 0)
    new_customers_by_tier = {tier: num_new_customers * new_customer_tier_split_pct[year][tier] for tier in customer_tiers}

    # Calcul des Clients Retenus (nés les années précédentes)
    customers_start_year_by_tier = customers_end_prev_year_by_tier.copy() # Les clients de fin d'année précédente deviennent ceux de début cette année

    retained_customers_by_tier = {tier: customers_start_year_by_tier[tier] * (1 - churn_rate_pct[tier]) for tier in customer_tiers}

    # Calcul des Clients en Fin d'Année
    customers_end_this_year_by_tier = {tier: retained_customers_by_tier[tier] + new_customers_by_tier[tier] for tier in customer_tiers}
    customers_end_prev_year_by_tier = customers_end_this_year_by_tier # Mise à jour pour le prochain tour de boucle

    # Mise à jour du DataFrame df_customers (tracking par cohorte)
    # Clients acquis CETTE année
    for tier in customer_tiers:
         df_customers.loc[year, (year, tier)] = new_customers_by_tier[tier]

    # Clients retenus des cohortes PRÉCÉDENTES pour cette année
    if year > model_years[0]:
        for cohort_year in model_years:
             if cohort_year < year:
                 for tier in customer_tiers:
                      # Clients restant de cette cohorte à la fin de l'année précédente
                      customers_prev_year = df_customers.loc[cohort_year, (year-1, tier)]
                      # Clients restant de cette cohorte à la fin de CETTE année (après churn)
                      df_customers.loc[cohort_year, (year, tier)] = customers_prev_year * (1 - churn_rate_pct[tier])


    # Calcul du Revenu
    total_revenue_this_year = 0
    new_customer_revenue_this_year = 0
    existing_customer_revenue_this_year = 0
    previous_year_revenue_from_existing = 0 # Nécessaire pour le calcul NRR global pondéré

    for tier in customer_tiers:
        # Revenu des nouveaux clients cette année
        new_rev_tier = new_customers_by_tier[tier] * arpc_tiers[tier]
        df_revenue.loc[year, (year, tier)] = new_rev_tier # Stocke le revenu généré par les nouveaux clients de cette cohorte/année
        new_customer_revenue_this_year += new_rev_tier
        total_revenue_this_year += new_rev_tier

        # Revenu des clients existants (toutes cohortes précédentes)
        # On calcule le revenu généré par les clients RETENUS de chaque cohorte précédente
        for cohort_year in model_years:
            if cohort_year < year:
                # Clients retenus de cette cohorte à la fin de CETTE année
                retained_cust_cohort = df_customers.loc[cohort_year, (year, tier)]
                # Clients de cette cohorte à la fin de l'année PRÉCÉDENTE (avant churn)
                # Si year-1 est le premier an, ces clients sont les nouveaux clients de cohort_year
                customers_prev_year_start = df_customers.loc[cohort_year, (year-1, tier)] if year-1 >= model_years[0] else df_customers.loc[cohort_year, (cohort_year, tier)]

                # Revenu généré par cette cohorte l'année précédente (si existante)
                prev_year_cohort_revenue = df_revenue.loc[cohort_year, (year-1, tier)] if year-1 >= model_years[0] else (df_customers.loc[cohort_year, (cohort_year, tier)] * arpc_tiers[tier] if cohort_year < year else 0)

                # Revenu des clients retenus (qui étaient là l'an dernier) cette année, incluant expansion
                # Simplification: Appliquer l'expansion à l'ARPC des clients retenus de l'an dernier
                # Ou alternative plus simple pour le modèle: calculer le revenu généré par les clients retenus * leur ARPC + Expansion
                # Revenu généré par les clients restants de cette cohorte cette année
                rev_cohort_this_year = retained_cust_cohort * arpc_tiers[tier] * (1 + expansion_rate_pct[tier])
                df_revenue.loc[cohort_year, (year, tier)] = rev_cohort_this_year # Stocke le revenu généré par les clients restants de cette cohorte dans l'année

                existing_customer_revenue_this_year += rev_cohort_this_year
                total_revenue_this_year += rev_cohort_this_year
                previous_year_revenue_from_existing += prev_year_cohort_revenue # Accumuler le revenu de l'an dernier pour le calcul NRR global

    # Calcul des Coûts
    cogs_this_year = total_revenue_this_year * cogs_pct
    total_opex_this_year = sum(opex_annual[year].values())

    # Calcul du Profit (EBITDA)
    gross_profit_this_year = total_revenue_this_year - cogs_this_year
    ebitda_this_year = gross_profit_this_year - total_opex_this_year

    # --- Mise à jour du DataFrame df_financials ---
    df_financials.loc['Revenue', year] = total_revenue_this_year
    df_financials.loc['COGS', year] = cogs_this_year
    df_financials.loc['Gross Profit', year] = gross_profit_this_year
    df_financials.loc['Total OpEx', year] = total_opex_this_year
    df_financials.loc['EBITDA', year] = ebitda_this_year
    df_financials.loc['Gross Margin (%)', year] = gross_profit_this_year / total_revenue_this_year if total_revenue_this_year > 0 else 0
    df_financials.loc['EBITDA Margin (%)', year] = ebitda_this_year / total_revenue_this_year if total_revenue_this_year > 0 else 0

    df_financials.loc['New Customers', year] = num_new_customers
    df_financials.loc['Customers (End Year)', year] = sum(customers_end_this_year_by_tier.values())
    df_financials.loc['Customers (Start Year)', year] = sum(customers_start_year_by_tier.values())
    df_financials.loc['Retained Customers', year] = sum(retained_customers_by_tier.values())


    # Calcul des Métriques SaaS pour l'année
    total_customers_end_year = df_financials.loc['Customers (End Year)', year]
    total_customers_start_year = df_financials.loc['Customers (Start Year)', year]

    # ARPC Overall (moyenne pondérée)
    total_end_year_revenue = sum(df_revenue[year].sum()) # Somme de tous les revenus générés cette année par toutes les cohortes restantes
    df_financials.loc['ARPC (Overall)', year] = total_end_year_revenue / total_customers_end_year if total_customers_end_year > 0 else 0

    # CAC Overall (simplifié: S&M de l'année / nouveaux clients de l'année)
    total_sm_opex = opex_annual[year]['S&M']
    df_financials.loc['CAC (Overall)', year] = total_sm_opex / num_new_customers if num_new_customers > 0 else 0

    # CAC Payback (Mois)
    arpc_overall = df_financials.loc['ARPC (Overall)', year]
    gross_margin_pct = df_financials.loc['Gross Margin (%)', year]
    cac_overall = df_financials.loc['CAC (Overall)', year]
    monthly_gross_profit_per_customer = (arpc_overall / 12) * gross_margin_pct
    df_financials.loc['CAC Payback (Months)', year] = cac_overall / monthly_gross_profit_per_customer if monthly_gross_profit_per_customer > 0 else 0

    # LTV Overall (simplifié: ARPC moyen / Churn moyen pondéré)
    # Churn moyen pondéré: (Clients start * Churn tier) sum / Clients start total
    if total_customers_start_year > 0:
        weighted_avg_churn = sum(customers_start_year_by_tier[tier] * churn_rate_pct[tier] for tier in customer_tiers) / total_customers_start_year
    else:
        weighted_avg_churn = sum(new_customers_by_tier[tier] * churn_rate_pct[tier] for tier in customer_tiers) / num_new_customers if num_new_customers > 0 else 0

    # Utilise l'ARPC moyen DE L'ANNEE courante pour le calcul LTV simplifié
    df_financials.loc['LTV (Overall)', year] = (arpc_overall * gross_margin_pct) / weighted_avg_churn if weighted_avg_churn > 0 else float('inf') # LTV basé sur marge brute


    # LTV:CAC Ratio
    ltv_overall = df_financials.loc['LTV (Overall)', year]
    df_financials.loc['LTV:CAC Ratio', year] = ltv_overall / cac_overall if cac_overall > 0 else float('inf')

    # NRR (Net Revenue Retention)
    # NRR = (Revenue from customers existing at start of year + Expansion Revenue) / Revenue from same customers in previous year
    # Revenue from customers existing at start of year = sum(df_revenue.loc[cohort_year, (year-1, tier)] * (1 - churn_rate_pct[tier]) * (1 + expansion_rate_pct[tier]) for cohort_year in model_years for tier in customer_tiers if cohort_year < year and year-1 >= model_years[0])
    # Revenue from same customers in previous year = sum(df_revenue.loc[cohort_year, (year-1, tier)] for cohort_year in model_years for tier in customer_tiers if cohort_year < year and year-1 >= model_years[0])

    # Version simplifiée de NRR basée sur le calcul ci-dessus, mais pondérée par le revenu de l'année précédente
    # NRR global = Somme( Revenu cohorte année N / Revenu cohorte année N-1 ) pondérée par Revenu cohorte année N-1
    # Ou encore plus simple: (Revenue existant gardé + Expansion) / Revenue existant début période
    # Revenue généré cette année par les clients qui étaient là l'an dernier
    revenue_from_retained_customers_this_year = existing_customer_revenue_this_year

    # Revenue généré l'an dernier par ces MÊMES clients (ceux qui sont là au début de cette année)
    revenue_from_these_customers_last_year = previous_year_revenue_from_existing # C'est ce que j'ai accumulé ci-dessus
    # Attention: this is slightly off as 'previous_year_revenue_from_existing' includes expansion from Year-2 to Year-1.
    # A more accurate NRR calculation requires tracking revenue *potential* from the start-of-year cohort *before* applying this year's churn/expansion.
    # Let's use the simplified weighted average NRR from churn and expansion rates for illustration, recognizing its limitation:
    # Weighted Avg NRR = Sum ( % of Revenue from Tier_i in Year-1 * (1 - Churn_Rate_Tier_i + Expansion_Rate_Tier_i) )
    if year > model_years[0]:
         # Need revenue breakdown by tier for the *start-of-year* cohort's revenue in the *previous* year
         revenue_start_year_cohort_prev_year_by_tier = {}
         total_revenue_start_year_cohort_prev_year = 0
         for tier in customer_tiers:
              rev_tier = sum(df_revenue.loc[cohort_year, (year-1, tier)] for cohort_year in model_years if cohort_year < year)
              revenue_start_year_cohort_prev_year_by_tier[tier] = rev_tier
              total_revenue_start_year_cohort_prev_year += rev_tier

         if total_revenue_start_year_cohort_prev_year > 0:
              weighted_avg_nrr = sum(
                   (revenue_start_year_cohort_prev_year_by_tier[tier] / total_revenue_start_year_cohort_prev_year) * (1 - churn_rate_pct[tier] + expansion_rate_pct[tier])
                   for tier in customer_tiers
              )
              df_financials.loc['NRR (Overall)', year] = weighted_avg_nrr
         else:
              df_financials.loc['NRR (Overall)', year] = 1 # Or NaN if no existing customers
    else:
        df_financials.loc['NRR (Overall)', year] = np.nan # NRR not applicable in Year 1

# --- Calculs Post-Simulation ---
# SOM (Serviceable Obtainable Market) = Revenu cumulé sur les 5 ans
som_cumulative_5_years_eur_m = df_financials.loc['Revenue', model_years].sum() / 1_000_000

# Peak Annual Revenue
peak_annual_revenue_eur_m = df_financials.loc['Revenue', model_years].max() / 1_000_000

# Peak Annual Revenue as % of SAM
peak_revenue_vs_sam_pct = (peak_annual_revenue_eur_m / (sam_europe_eur_bn * 1000)) if sam_europe_eur_bn > 0 else 0

# --- Création du Fichier Excel ---
output_filename = 'hashguard_financial_model.xlsx'

with pd.ExcelWriter(output_filename, engine='openpyxl') as writer:
    # Ajouter les styles personnalisés au workbook
    workbook = writer.book
    workbook.add_named_style(header_style)
    workbook.add_named_style(currency_style)
    workbook.add_named_style(percent_style)
    workbook.add_named_style(integer_style)

    # --- Onglet 1: Inputs ---
    df_inputs_data = {
        'Parameter': [
            'Model Years',
            'TAM Global (2030, €Bn)',
            'SAM Europe (€Bn)',
            'SAM France Share (%)', 'SAM Germany Share (%)', 'SAM Other EU Share (%)',
            'ARPC Essentials (€)', 'ARPC Business Pro (€)', 'ARPC Enterprise (€)',
            'New Customers FY26', 'New Customers FY27', 'New Customers FY28', 'New Customers FY29', 'New Customers FY30',
            'FY26 New Cust Split Essentials (%)', 'FY26 New Cust Split Pro (%)', 'FY26 New Cust Split Enterprise (%)',
            'FY27 New Cust Split Essentials (%)', 'FY27 New Cust Split Pro (%)', 'FY27 New Cust Split Enterprise (%)',
            'FY28 New Cust Split Essentials (%)', 'FY28 New Cust Split Pro (%)', 'FY28 New Cust Split Enterprise (%)',
            'FY29 New Cust Split Essentials (%)', 'FY29 New Cust Split Pro (%)', 'FY29 New Cust Split Enterprise (%)',
            'FY30 New Cust Split Essentials (%)', 'FY30 New Cust Split Pro (%)', 'FY30 New Cust Split Enterprise (%)',
            'Churn Rate Essentials (%)', 'Churn Rate Business Pro (%)', 'Churn Rate Enterprise (%)',
            'Expansion Rate Essentials (%)', 'Expansion Rate Business Pro (%)', 'Expansion Rate Enterprise (%)',
            'COGS Rate (%)',
            'S&M OpEx FY26 (€)', 'R&D OpEx FY26 (€)', 'G&A OpEx FY26 (€)',
            'S&M OpEx FY27 (€)', 'R&D OpEx FY27 (€)', 'G&A OpEx FY27 (€)',
            'S&M OpEx FY28 (€)', 'R&D OpEx FY28 (€)', 'G&A OpEx FY28 (€)',
            'S&M OpEx FY29 (€)', 'R&D OpEx FY29 (€)', 'G&A OpEx FY29 (€)',
            'S&M OpEx FY30 (€)', 'R&D OpEx FY30 (€)', 'G&A OpEx FY30 (€)',
        ],
        'Value': [
            ', '.join(map(str, model_years)),
            tam_global_2030_eur_bn,
            sam_europe_eur_bn,
            sam_breakdown_pct['France'], sam_breakdown_pct['Germany'], sam_breakdown_pct['Other EU'],
            arpc_tiers['Essentials'], arpc_tiers['Business Pro'], arpc_tiers['Enterprise'],
            new_customers_per_year[2026], new_customers_per_year[2027], new_customers_per_year[2028], new_customers_per_year[2029], new_customers_per_year[2030],
            new_customer_tier_split_pct[2026]['Essentials'], new_customer_tier_split_pct[2026]['Business Pro'], new_customer_tier_split_pct[2026]['Enterprise'],
            new_customer_tier_split_pct[2027]['Essentials'], new_customer_tier_split_pct[2027]['Business Pro'], new_customer_tier_split_pct[2027]['Enterprise'],
            new_customer_tier_split_pct[2028]['Essentials'], new_customer_tier_split_pct[2028]['Business Pro'], new_customer_tier_split_pct[2028]['Enterprise'],
            new_customer_tier_split_pct[2029]['Essentials'], new_customer_tier_split_pct[2029]['Business Pro'], new_customer_tier_split_pct[2029]['Enterprise'],
            new_customer_tier_split_pct[2030]['Essentials'], new_customer_tier_split_pct[2030]['Business Pro'], new_customer_tier_split_pct[2030]['Enterprise'],
            churn_rate_pct['Essentials'], churn_rate_pct['Business Pro'], churn_rate_pct['Enterprise'],
            expansion_rate_pct['Essentials'], expansion_rate_pct['Business Pro'], expansion_rate_pct['Enterprise'],
            cogs_pct,
            opex_annual[2026]['S&M'], opex_annual[2026]['R&D'], opex_annual[2026]['G&A'],
            opex_annual[2027]['S&M'], opex_annual[2027]['R&D'], opex_annual[2027]['G&A'],
            opex_annual[2028]['S&M'], opex_annual[2028]['R&D'], opex_annual[2028]['G&A'],
            opex_annual[2029]['S&M'], opex_annual[2029]['R&D'], opex_annual[2029]['G&A'],
            opex_annual[2030]['S&M'], opex_annual[2030]['R&D'], opex_annual[2030]['G&A'],
        ]
    }
    df_inputs = pd.DataFrame(df_inputs_data)
    df_inputs.to_excel(writer, sheet_name='Inputs', index=False)
    sheet = writer.sheets['Inputs']

    # Apply header style
    for col in range(1, len(df_inputs.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'

    # Auto-ajuster la largeur des colonnes (approximatif) et formater
    for col in range(1, len(df_inputs.columns) + 1):
         sheet.column_dimensions[get_column_letter(col)].width = 25 # Ajuster si nécessaire

    # --- Onglet 2: Market Sizing ---
    df_market_sizing_data = {
        'Metric': [
            f'TAM Global (2030, {CURRENCY_SYMBOL}Bn)',
            f'SAM Europe ({CURRENCY_SYMBOL}Bn)',
            'SAM Breakdown: France (%)',
            'SAM Breakdown: Germany (%)',
            'SAM Breakdown: Other EU (%)',
            'Targetable Companies (France)',
            'Targetable Companies (Germany)',
            'Targetable Companies (Other EU)',
            'Targetable Companies (Total EU)',
            f'SOM (Cumulative 5 Years, {CURRENCY_SYMBOL}M)',
            f'Peak Annual Revenue ({CURRENCY_SYMBOL}M)',
            'Peak Annual Revenue vs SAM (%)'
        ],
        'Value': [
            tam_global_2030_eur_bn,
            sam_europe_eur_bn,
            sam_breakdown_pct['France'],
            sam_breakdown_pct['Germany'],
            sam_breakdown_pct['Other EU'],
            sum(targetable_companies_france.values()),
            sum(targetable_companies_germany.values()),
            sum(targetable_companies_other_eu.values()),
            sum(targetable_companies_eu.values()),
            som_cumulative_5_years_eur_m,
            peak_annual_revenue_eur_m,
            peak_revenue_vs_sam_pct
        ],
        'Notes': [
            'Source: External market reports & Pitch deck',
            'Source: External market reports & Pitch deck',
            '', '', '',
            'Estimate of relevant entities',
            'Estimate based on SAM split',
            'Estimate based on SAM split',
            'Sum of France, Germany, Other EU',
            'Calculated by model',
            'Calculated by model',
            'Calculated by model'
        ]
    }
    df_market_sizing = pd.DataFrame(df_market_sizing_data)
    df_market_sizing.to_excel(writer, sheet_name='Market Sizing', index=False)
    sheet = writer.sheets['Market Sizing']

    # Apply header style
    for col in range(1, len(df_market_sizing.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'

    # Apply number formats
    for row_idx, metric in enumerate(df_market_sizing['Metric']):
         cell = sheet['B' + str(row_idx + 2)] # +2 because header is row 1 and pandas writes index=False starting row 2
         if '€Bn' in metric or '€M' in metric:
              cell.style = 'currency_style'
              cell.number_format = f'#,##0.00 {CURRENCY_SYMBOL}' if '€Bn' in metric else f'#,##0.0 {CURRENCY_SYMBOL}' # Format Bns with 2 dec, Ms with 1 dec
         elif '%' in metric:
              cell.style = 'percent_style'
         else:
              cell.style = 'integer_style'

    # Auto-adjust column width
    for col in range(1, len(df_market_sizing.columns) + 1):
         sheet.column_dimensions[get_column_letter(col)].width = 25 # Ajuster si nécessaire


    # --- Onglet 3: Pricing ---
    df_pricing_data = {
        'Tier': list(arpc_tiers.keys()) + [''], # Add empty row for separation
        f'ARPC Annuel ({CURRENCY_SYMBOL})': list(arpc_tiers.values()) + [''],
        'Churn Rate (%)': list(churn_rate_pct.values()) + [''],
        'Expansion Rate (%)': list(expansion_rate_pct.values()) + [''],
        'Target Segments': [
            'Petites IE, Départements',
            'IE Moyennes/Grandes, EE Petites/Moyennes',
            'EE Grandes, Secteurs Critiques',
            '' # Empty row
        ],
        'Description': [
            'Certification de base, audit logs, rapports standards',
            'Workflows avancés, API, intégrations standards, analyse',
            'Déploiement dédié, intégrations personnalisées, IA, ZKP, Support Premium',
            '' # Empty row
        ]
    }
    df_pricing = pd.DataFrame(df_pricing_data)
    df_pricing.to_excel(writer, sheet_name='Pricing', index=False)
    sheet = writer.sheets['Pricing']

    # Apply header style
    for col in range(1, len(df_pricing.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'

    # Apply number formats to the data rows
    for row_idx in range(len(customer_tiers)):
         sheet[f'B{row_idx+2}'].style = 'currency_style'
         sheet[f'C{row_idx+2}'].style = 'percent_style'
         sheet[f'D{row_idx+2}'].style = 'percent_style'

    # Auto-adjust column width
    for col in range(1, len(df_pricing.columns) + 1):
         sheet.column_dimensions[get_column_letter(col)].width = 25 # Ajuster si nécessaire


    # --- Onglet 4: Customer Model (Cohort Analysis) ---
    # Rename columns for clarity in Excel
    df_customers_renamed = df_customers.copy()
    df_customers_renamed.columns = [f'FY{year} - {tier}' for year, tier in df_customers_renamed.columns]
    df_customers_renamed.index.name = 'Acquisition Cohort Year'
    df_customers_renamed.to_excel(writer, sheet_name='Customer Model', index=True)
    sheet = writer.sheets['Customer Model']

    # Apply header style
    for col in range(1, len(df_customers_renamed.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'
    sheet['A1'].style = 'header_style' # Style for the index header

    # Apply number format (integers)
    for row in sheet.iter_rows(min_row=2, max_row=sheet.max_row, min_col=2, max_col=sheet.max_column):
        for cell in row:
            cell.style = 'integer_style'

    # Auto-adjust column width
    for col in range(1, len(df_customers_renamed.columns) + 2): # +2 for index column
         sheet.column_dimensions[get_column_letter(col)].width = 15 # Ajuster si nécessaire


    # --- Onglet 5: Revenue Model (Cohort Analysis) ---
    # Rename columns for clarity in Excel
    df_revenue_renamed = df_revenue.copy()
    df_revenue_renamed.columns = [f'FY{year} - {tier}' for year, tier in df_revenue_renamed.columns]
    df_revenue_renamed.index.name = 'Acquisition Cohort Year'
    df_revenue_renamed.to_excel(writer, sheet_name='Revenue Model', index=True)
    sheet = writer.sheets['Revenue Model']

    # Apply header style
    for col in range(1, len(df_revenue_renamed.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'
    sheet['A1'].style = 'header_style' # Style for the index header

    # Apply currency format
    for row in sheet.iter_rows(min_row=2, max_row=sheet.max_row, min_col=2, max_col=sheet.max_column):
        for cell in row:
            cell.style = 'currency_style'

    # Auto-adjust column width
    for col in range(1, len(df_revenue_renamed.columns) + 2): # +2 for index column
         sheet.column_dimensions[get_column_letter(col)].width = 18 # Ajuster si nécessaire


    # --- Onglet 6: Financial Summary & Metrics ---
    # Rename columns for clarity
    df_financials_renamed = df_financials.copy()
    df_financials_renamed.columns = [f'FY{year}' for year in df_financials_renamed.columns]
    df_financials_renamed.index.name = 'Metric'
    df_financials_renamed.to_excel(writer, sheet_name='Financial Summary', index=True)
    sheet = writer.sheets['Financial Summary']

    # Apply header style
    for col in range(1, len(df_financials_renamed.columns) + 1):
         sheet[get_column_letter(col) + '1'].style = 'header_style'
    sheet['A1'].style = 'header_style' # Style for the index header

    # Apply number formats to rows
    for row_idx, metric in enumerate(df_financials_renamed.index):
         row_num_excel = row_idx + 2 # Excel rows start at 1, pandas index at 0, header is 1
         for col_idx, year in enumerate(model_years):
              cell = sheet[get_column_letter(col_idx + 2) + str(row_num_excel)] # +2 for column B
              if '€' in metric or 'LTV' in metric or 'CAC' in metric: # Heuristique simple pour les devises/montants
                   cell.style = 'currency_style'
              elif '%' in metric or 'NRR' in metric: # NRR est un pourcentage
                   cell.style = 'percent_style'
              elif 'Customers' in metric or 'New Customers' in metric or 'Retained Customers' in metric or 'Months' in metric:
                  cell.style = 'integer_style'
              else:
                   # Default or no specific format
                   pass # Laisser le format par défaut de pandas ou rien

    # Auto-adjust column width
    for col in range(1, len(df_financials_renamed.columns) + 2): # +2 for index column
         sheet.column_dimensions[get_column_letter(col)].width = 18 # Ajuster si nécessaire

    sheet.column_dimensions['A'].width = 25 # Width for the metric name column


# --- Instruction Finale ---
print(f"Modèle financier Hashguard NEXT créé : {output_filename}")
print("Ouvrez ce fichier Excel pour visualiser et modifier les hypothèses dans l'onglet 'Inputs'.")

