/**
 * All user-facing strings for the MileMoney expense tracker, in English and
 * French ONLY. No other language exists in this file. Server-safe: the PDF
 * route imports these directly, while the client provider (lib/locale.tsx)
 * exposes them through a hook.
 */

export type Locale = "en" | "fr";

export const STRINGS = {
  en: {
    // App nav + header
    dashboard: "Dashboard",
    addExpense: "Add Expense",
    signOut: "Sign out",
    language: "Language",
    // Dashboard
    monthTotal: "Month total",
    categorySummary: "Category Summary",
    expensesHeading: "Expenses",
    ofTotal: "% of total",
    noExpensesMonth:
      "No expenses this month yet. Add your first one with the buttons above.",
    loading: "Loading…",
    prev: "‹ Prev",
    next: "Next ›",
    selectMonth: "Select month",
    addExpenseBtn: "＋ Add Expense",
    scanReceipt: "Scan Receipt",
    monthlyPdf: "Monthly PDF",
    preparing: "Preparing…",
    viewReceipt: "View receipt",
    opening: "Opening…",
    pleaseSignIn: "Please sign in to view your expenses.",
    loadError: "Could not load expenses.",
    receiptError: "Could not open the receipt.",
    pdfError: "Could not generate the PDF.",
    expenseOne: "expense",
    expenseMany: "expenses",
    // Income + profit
    income: "Income",
    incomeTitle: "Load Income",
    incomeSub:
      "Freight, fuel surcharge, deductions and partial settlements.",
    addLoadBtn: "＋ Add Load",
    loadReference: "Load reference",
    carrierBroker: "Carrier / broker",
    pickupDate: "Pickup date",
    deliveryDate: "Delivery date",
    currency: "Currency",
    grossFreight: "Gross freight",
    fuelSurcharge: "Fuel surcharge",
    accessorials: "Accessorials",
    carrierDeductions: "Carrier deductions",
    netAmount: "Net amount",
    received: "Received",
    outstanding: "Outstanding",
    statusPaid: "Paid",
    statusPartial: "Partially paid",
    statusUnpaid: "Unpaid",
    recordPayment: "＋ Record payment",
    paymentDate: "Payment date",
    paymentAmount: "Payment amount",
    memo: "Memo (optional)",
    saveLoad: "Save load",
    savePayment: "Save payment",
    deleteLoad: "Delete load",
    deleteLoadConfirm: "Delete this load and its recorded payments?",
    noLoads:
      "No loads yet. Add your first load to track revenue and unpaid balances.",
    loadSaved: "Load saved.",
    paymentSaved: "Payment saved.",
    incomeLoadError: "Could not load income.",
    saveLoadError: "Could not save the load.",
    savePaymentError: "Could not save the payment.",
    overpaymentError: "Payment exceeds the outstanding balance.",
    invalidLoad: "Enter a delivery date and amounts of zero or more.",
    invalidPayment:
      "Enter a valid payment date and an amount greater than zero.",
    delivered: "Delivered",
    profitHeading: "Operating Profit Estimate",
    profitLabel: "Operating profit",
    methodCash: "Cash received",
    profitNote:
      "Profit excludes taxes, owner compensation and unrecorded costs.",
    secureWorkspace: "Secure workspace",
    // Categories
    catDiesel: "Diesel",
    catRepair: "Repair",
    catToll: "Toll",
    catFood: "Food",
    catOther: "Other",
    // Add expense form
    addExpenseTitle: "Add Expense",
    scanHint:
      "Choose a receipt photo, tap Scan Receipt to auto-fill vendor, amount, date and category, then check the values before saving.",
    scanResultTitle: "Expense Scan Result",
    scannedReceipt: "Scanned receipt",
    aiDetected: "AI detected",
    aiAutoFilled: "Auto-filled",
    aiFilledNote: "AI filled these — tap any field to correct",
    vendor: "Vendor",
    vendorPlaceholder: "e.g. Petro-Canada",
    retakePhoto: "Retake Photo",
    confirmSave: "Confirm & Save",
    date: "Date",
    category: "Category",
    amount: "Amount",
    note: "Note (optional)",
    notePlaceholder: "e.g. Petro-Canada, tire shop",
    receiptPhoto: "Receipt photo (optional)",
    scanning: "Scanning…",
    scannedCheck:
      "Scanned from your receipt — please check the values before saving.",
    scanNoData:
      "Could not read an amount or date from this receipt — enter them manually below.",
    scanFailed:
      "Receipt scan did not work on this photo — enter the amount and date manually below.",
    choosePhotoFirst:
      "Choose a receipt photo first, then tap Scan Receipt.",
    invalidAmount: "Enter a valid date and an amount greater than zero.",
    saveError: "Could not save the expense.",
    expenseSaved: "Expense saved.",
    saveExpense: "Save Expense",
    saving: "Saving…",
    cancel: "Cancel",
    // PDF export
    pdfTitle: "MileMoney — Monthly Expenses",
    // Expenses history + edit + delete + reports (v1.3)
    reports: "Reports",
    searchExpenses: "Search expenses",
    allCategories: "All",
    noExpensesFound: "No expenses match your search.",
    edit: "Edit",
    delete: "Delete",
    editExpense: "Edit Expense",
    deleteExpenseTitle: "Delete expense?",
    deleteExpenseConfirm: "Delete this expense? This cannot be undone.",
    deleteReceiptAlso: "Also delete receipt photo",
    deleteReceiptNote:
      "Receipts are financial evidence. Keep this unchecked unless you are sure you no longer need the photo.",
    deleteExpense: "Delete expense",
    deleting: "Deleting…",
    expenseDeleted: "Expense deleted.",
    deleteError: "Could not delete the expense.",
    notYourExpense: "This expense does not belong to your account.",
    expenseUpdated: "Expense updated.",
    updateError: "Could not update the expense.",
    expenseNotFound: "Expense not found.",
    saveChanges: "Save changes",
    editReceiptKept: "The receipt photo on file is unchanged by edits.",
    reportsSub: "Download a monthly PDF or CSV for the selected month.",
    downloadCsv: "Download CSV",
    csvError: "Could not generate the CSV.",
    csvDate: "date",
    csvCategory: "category",
    csvAmount: "amount",
    csvCurrency: "currency",
    csvNote: "note",
    csvReceipt: "receipt",
    csvYes: "yes",
    csvNo: "no",
    pdfBreakdown: "Category Breakdown",
    pdfExpenses: "Expenses",
    pdfMonthTotal: "Month total: ",
    pdfOutstanding: "Outstanding payments",
    pdfNoExpenses: "No expenses recorded this month.",
    pdfGenerated: "Generated from MileMoney.",
    // Landing
    landingTitle: "Expense tracker for drivers & owner-operators",
    landingSub:
      "Track your daily expenses, scan receipts, and get a clean monthly PDF — with diesel, repair, toll, food and other costs kept separate.",
    landingF1: "Daily expenses, entered in seconds",
    landingF2:
      "Receipt scan that auto-fills vendor, amount, date and category",
    landingF3: "Month-to-month PDF with a category-wise breakdown",
    login: "Log in",
    signup: "Sign up",
    // Auth hero
    heroTagline: "Expense tracker for drivers & owner-operators.",
    heroF1t: "Monthly dashboard",
    heroF1d: "Diesel, repair, toll and food — kept separate.",
    heroF2t: "Receipt scan",
    heroF2d: "Snap a receipt to auto-fill vendor, amount, date and category.",
    heroF3t: "Monthly PDF",
    heroF3d: "A clean category-wise report every month.",
    // Auth forms
    welcomeBack: "Welcome back",
    signInSub: "Sign in to your expense tracker.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    noAccount: "No account?",
    createOne: "Create one",
    createAccount: "Create your account",
    signupSub: "Create your account to start tracking expenses.",
    createAccountBtn: "Create account",
    creating: "Creating…",
    haveAccount: "Already have an account?",
    checkEmail:
      "Account created! Check your email for a confirmation link (check spam too), then sign in.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  fr: {
    // App nav + header
    dashboard: "Tableau de bord",
    addExpense: "Ajouter une dépense",
    signOut: "Se déconnecter",
    language: "Langue",
    // Dashboard
    monthTotal: "Total du mois",
    categorySummary: "Résumé par catégorie",
    expensesHeading: "Dépenses",
    ofTotal: "% du total",
    noExpensesMonth:
      "Aucune dépense ce mois-ci. Ajoutez-en une avec les boutons ci-dessus.",
    loading: "Chargement…",
    prev: "‹ Préc.",
    next: "Suiv. ›",
    selectMonth: "Sélectionner le mois",
    addExpenseBtn: "＋ Ajouter une dépense",
    scanReceipt: "Numériser un reçu",
    monthlyPdf: "PDF mensuel",
    preparing: "Préparation…",
    viewReceipt: "Voir le reçu",
    opening: "Ouverture…",
    pleaseSignIn: "Veuillez vous connecter pour voir vos dépenses.",
    loadError: "Impossible de charger les dépenses.",
    receiptError: "Impossible d'ouvrir le reçu.",
    pdfError: "Impossible de générer le PDF.",
    expenseOne: "dépense",
    expenseMany: "dépenses",
    // Revenus + bénéfice
    income: "Revenus",
    incomeTitle: "Revenus des chargements",
    incomeSub:
      "Fret, supplément carburant, déductions et règlements partiels.",
    addLoadBtn: "＋ Ajouter un chargement",
    loadReference: "Référence du chargement",
    carrierBroker: "Transporteur / courtier",
    pickupDate: "Date de ramassage",
    deliveryDate: "Date de livraison",
    currency: "Devise",
    grossFreight: "Fret brut",
    fuelSurcharge: "Supplément carburant",
    accessorials: "Frais accessoires",
    carrierDeductions: "Déductions du transporteur",
    netAmount: "Montant net",
    received: "Reçu",
    outstanding: "Solde impayé",
    statusPaid: "Payé",
    statusPartial: "Partiellement payé",
    statusUnpaid: "Impayé",
    recordPayment: "＋ Enregistrer un paiement",
    paymentDate: "Date du paiement",
    paymentAmount: "Montant du paiement",
    memo: "Mémo (facultatif)",
    saveLoad: "Enregistrer le chargement",
    savePayment: "Enregistrer le paiement",
    deleteLoad: "Supprimer le chargement",
    deleteLoadConfirm:
      "Supprimer ce chargement et ses paiements enregistrés ?",
    noLoads:
      "Aucun chargement pour l'instant. Ajoutez votre premier chargement pour suivre les revenus et les soldes impayés.",
    loadSaved: "Chargement enregistré.",
    paymentSaved: "Paiement enregistré.",
    incomeLoadError: "Impossible de charger les revenus.",
    saveLoadError: "Impossible d'enregistrer le chargement.",
    savePaymentError: "Impossible d'enregistrer le paiement.",
    overpaymentError: "Le paiement dépasse le solde impayé.",
    invalidLoad:
      "Entrez une date de livraison et des montants de zéro ou plus.",
    invalidPayment:
      "Entrez une date de paiement valide et un montant supérieur à zéro.",
    delivered: "Livré le",
    profitHeading: "Estimation du bénéfice d'exploitation",
    profitLabel: "Bénéfice d'exploitation",
    methodCash: "Encaissements",
    profitNote:
      "Le bénéfice exclut les taxes, la rémunération du propriétaire et les coûts non enregistrés.",
    secureWorkspace: "Espace sécurisé",
    // Categories
    catDiesel: "Diesel",
    catRepair: "Réparation",
    catToll: "Péage",
    catFood: "Nourriture",
    catOther: "Autre",
    // Add expense form
    addExpenseTitle: "Ajouter une dépense",
    scanHint:
      "Choisissez une photo de reçu, touchez « Numériser un reçu » pour remplir automatiquement le fournisseur, le montant, la date et la catégorie, puis vérifiez les valeurs avant d'enregistrer.",
    scanResultTitle: "Résultat de la numérisation",
    scannedReceipt: "Reçu numérisé",
    aiDetected: "Détecté par l'IA",
    aiAutoFilled: "Rempli automatiquement",
    aiFilledNote:
      "L'IA a rempli ces champs — touchez un champ pour corriger",
    vendor: "Fournisseur",
    vendorPlaceholder: "p. ex. Petro-Canada",
    retakePhoto: "Reprendre la photo",
    confirmSave: "Confirmer et enregistrer",
    date: "Date",
    category: "Catégorie",
    amount: "Montant",
    note: "Note (facultatif)",
    notePlaceholder: "p. ex. Petro-Canada, pneus",
    receiptPhoto: "Photo du reçu (facultatif)",
    scanning: "Numérisation…",
    scannedCheck:
      "Lu sur votre reçu — veuillez vérifier les valeurs avant d'enregistrer.",
    scanNoData:
      "Impossible de lire un montant ou une date sur ce reçu — saisissez-les manuellement ci-dessous.",
    scanFailed:
      "La numérisation n'a pas fonctionné pour cette photo — saisissez le montant et la date manuellement ci-dessous.",
    choosePhotoFirst:
      "Choisissez d'abord une photo de reçu, puis touchez « Numériser un reçu ».",
    invalidAmount: "Entrez une date valide et un montant supérieur à zéro.",
    saveError: "Impossible d'enregistrer la dépense.",
    expenseSaved: "Dépense enregistrée.",
    saveExpense: "Enregistrer la dépense",
    saving: "Enregistrement…",
    cancel: "Annuler",
    // PDF export
    pdfTitle: "MileMoney — Dépenses mensuelles",
    // Historique des dépenses + modification + suppression + rapports (v1.3)
    reports: "Rapports",
    searchExpenses: "Rechercher des dépenses",
    allCategories: "Toutes",
    noExpensesFound: "Aucune dépense ne correspond à votre recherche.",
    edit: "Modifier",
    delete: "Supprimer",
    editExpense: "Modifier la dépense",
    deleteExpenseTitle: "Supprimer la dépense ?",
    deleteExpenseConfirm:
      "Supprimer cette dépense ? Cette action est irréversible.",
    deleteReceiptAlso: "Supprimer aussi la photo du reçu",
    deleteReceiptNote:
      "Les reçus sont des preuves financières. Laissez cette case décochée sauf si vous êtes sûr de ne plus avoir besoin de la photo.",
    deleteExpense: "Supprimer la dépense",
    deleting: "Suppression…",
    expenseDeleted: "Dépense supprimée.",
    deleteError: "Impossible de supprimer la dépense.",
    notYourExpense: "Cette dépense n'appartient pas à votre compte.",
    expenseUpdated: "Dépense mise à jour.",
    updateError: "Impossible de mettre à jour la dépense.",
    expenseNotFound: "Dépense introuvable.",
    saveChanges: "Enregistrer les modifications",
    editReceiptKept:
      "La photo du reçu enregistrée n'est pas modifiée par les modifications.",
    reportsSub:
      "Téléchargez un PDF ou un CSV mensuel pour le mois sélectionné.",
    downloadCsv: "Télécharger le CSV",
    csvError: "Impossible de générer le CSV.",
    csvDate: "date",
    csvCategory: "catégorie",
    csvAmount: "montant",
    csvCurrency: "devise",
    csvNote: "note",
    csvReceipt: "reçu",
    csvYes: "oui",
    csvNo: "non",
    pdfBreakdown: "Ventilation par catégorie",
    pdfExpenses: "Dépenses",
    pdfMonthTotal: "Total du mois : ",
    pdfOutstanding: "Paiements impayés",
    pdfNoExpenses: "Aucune dépense enregistrée ce mois-ci.",
    pdfGenerated: "Généré par MileMoney.",
    // Landing
    landingTitle:
      "Suivi des dépenses pour chauffeurs et chauffeurs-propriétaires",
    landingSub:
      "Suivez vos dépenses quotidiennes, numérisez vos reçus et obtenez un PDF mensuel clair — avec le diesel, les réparations, les péages, la nourriture et les autres coûts séparés.",
    landingF1: "Dépenses quotidiennes, saisies en quelques secondes",
    landingF2:
      "Numérisation des reçus qui remplit automatiquement le fournisseur, le montant, la date et la catégorie",
    landingF3: "PDF mensuel avec ventilation par catégorie",
    login: "Se connecter",
    signup: "S'inscrire",
    // Auth hero
    heroTagline:
      "Suivi des dépenses pour chauffeurs et chauffeurs-propriétaires.",
    heroF1t: "Tableau de bord mensuel",
    heroF1d: "Diesel, réparations, péages et nourriture — séparés.",
    heroF2t: "Numérisation des reçus",
    heroF2d:
      "Photographiez un reçu pour remplir automatiquement le fournisseur, le montant, la date et la catégorie.",
    heroF3t: "PDF mensuel",
    heroF3d: "Un rapport mensuel clair par catégorie.",
    // Auth forms
    welcomeBack: "Bon retour",
    signInSub: "Connectez-vous à votre suivi des dépenses.",
    email: "Courriel",
    password: "Mot de passe",
    signIn: "Se connecter",
    signingIn: "Connexion…",
    noAccount: "Pas de compte ?",
    createOne: "Créez-en un",
    createAccount: "Créez votre compte",
    signupSub: "Créez votre compte pour commencer le suivi des dépenses.",
    createAccountBtn: "Créer un compte",
    creating: "Création…",
    haveAccount: "Vous avez déjà un compte ?",
    checkEmail:
      "Compte créé ! Vérifiez votre courriel pour un lien de confirmation (vérifiez aussi les indésirables), puis connectez-vous.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
  },
} satisfies Record<Locale, Record<string, string>>;

export type StringKey = keyof (typeof STRINGS)["en"];
export type Strings = (typeof STRINGS)["en"];

/** "en-CA" for English, "fr-CA" for French — used for dates and currency. */
export function dateLocale(lang: Locale): string {
  return lang === "fr" ? "fr-CA" : "en-CA";
}

/** Resolve a language tag to a supported locale ("fr" wins on "fr*"). */
export function resolveLocale(value: string | null | undefined): Locale {
  if (value && value.toLowerCase().startsWith("fr")) return "fr";
  return "en";
}
