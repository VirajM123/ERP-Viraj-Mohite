import React from "react";
import "./GeneralSetup1.css";

/* =========================================================
   DEFAULT GENERAL SETUP VALUES
   ========================================================= */

/* =========================================================
PRODUCT SELECTION MODES
========================================================= */

const PRODUCT_SELECTION_MODES = [
    "PRODUCT_CODE",
    "COMPANY_PRODUCT_CODE",
    "SHORT_CODE",
    "LOCAL_PRODUCT_NAME",
    "EAN_NO",
    "PRODUCT_NAME",
];
/* =========================================================
   GENERAL SETUP DEFAULTS
========================================================= */

const DEFAULT_VAT_ON =
    "GROSS_AMOUNT";

const DEFAULT_CASH_DISCOUNT_ON =
    "BILL_NET_AMOUNT";

const DEFAULT_PRODUCT_SELECTION_ON =
    "PRODUCT_NAME";

const VAT_ON_VALUES = [
    "GROSS_AMOUNT",
    "NET_AMOUNT",
    "GROSS_SCHEME",
    "GROSS_SCHEME_STAR",
    "GROSS_SCHEME_CASH",
    "GROSS_CASH",
];
const DEFAULT_SELECTION =
    "AREA";

const DEFAULT_SELECTION_VALUES = [
    "AREA",
    "ROUTE",
];

const CASH_DISCOUNT_ON_VALUES = [
    "BILL_NET_AMOUNT",
    "ITEM_WISE_GROSS",
    "ITEM_WISE_GROSS_SCHEME",
    "BILL_GROSS_AMOUNT",
    "BILL_GROSS_SCHEME_VAT",
];

const PRODUCT_SELECTION_ON_VALUES = [
    "PRODUCT_CODE",
    "COMPANY_PRODUCT_CODE",
    "SHORT_CODE",
    "LOCAL_PRODUCT_NAME",
    "EAN_NO",
    "PRODUCT_NAME",
];

export const createDefaultGeneralSetup = () => ({




    /* Sales */
    billAllowBlacklistParty: false,
    allowChangeBillType: false,
    defaultSalesman: true,
    allowChangeSaleRate: false,
    allowMixBilling: false,
    saveInvoiceAfterLoad: false,
    allowEditBillAfterLoad: true,

    /* Billing / Transaction */
    editProductAfterLoad: true,

    vatOn:
        DEFAULT_VAT_ON,

    cashDiscountOn:
        DEFAULT_CASH_DISCOUNT_ON,

    productSelectionOn:
        DEFAULT_PRODUCT_SELECTION_ON,

    defaultCompany: "",
    defaultGodown: "",
    defaultSelection: DEFAULT_SELECTION,

    saveAndPrint: false,
    allowSRateLessThanPRate: false,
    updateLoadQtyAfterBillEdit: false,
    allowNegativeStock: false,

    /* Bill Print */
    goodsReturn: true,
    damageReturn: true,
    schemeSummary: true,
    vatSummary: true,
    serialNo: false,

    billingWithoutHsnCode: false,

    /* General */
    autoVoucherNo: true,
    dateLocking: "",
    showEntryDays: "10",
    billingWithoutHsnCode: false,
    /* General Setup 2 */
allowCessInPurchase: true,
allowCessInSale: false,
reverseScheme: false,
editGrossPurchase: false,
importNegative: true,
allowChangeStarAmount: false,
settleLoadNegative: true,
qrCodeFolderName: "",
saleSeriesByGst: false,
importWithZero: false,
autoBillLockDays: 0,
allowGstRate: false,
});

/* =========================================================
   TOGGLE SWITCH
   ========================================================= */
const ToggleSwitch = ({
    checked,
    onChange,
    disabled = false,
    title = "",
}) => {
    return (
        <label
            className={`gs-toggle ${checked ? "is-on" : "is-off"
                } ${disabled ? "is-disabled" : ""}`}
            title={title}
        >
            <input
                type="checkbox"
                checked={Boolean(checked)}
                disabled={disabled}
                onChange={(event) =>
                    onChange(event.target.checked)
                }
            />

            <span className="gs-toggle-track">
                <span className="gs-toggle-thumb" />
            </span>
        </label>
    );
};

/* =========================================================
   SETTING ROW
   ========================================================= */

const SettingRow = ({
    label,
    description = "",
    children,
}) => {
    return (
        <div className="gs-setting-row">
            <div className="gs-setting-label-area">
                <div className="gs-setting-label-line">
                    <span className="gs-setting-label">
                        {label}
                    </span>

                    {description && (
                        <span
                            className="gs-info-icon"
                            title={description}
                        >
                            i
                        </span>
                    )}
                </div>

                {description && (
                    <div className="gs-setting-description">
                        {description}
                    </div>
                )}
            </div>

            <div className="gs-setting-control">
                {children}
            </div>
        </div>
    );
};
/* =========================================================
   COMPACT TOGGLE SETTING
========================================================= */

const CompactToggleSetting = ({
    label,
    description = "",
    checked,
    onChange,
    disabled = false,
}) => {
    return (
        <div
            className={`gs-compact-toggle-card ${checked ? "is-enabled" : ""
                }`}
            title={description}
        >
            <div className="gs-compact-toggle-top">
                <span className="gs-compact-toggle-status">
                    {checked ? "ON" : "OFF"}
                </span>

                <ToggleSwitch
                    checked={checked}
                    disabled={disabled}
                    onChange={onChange}
                    title={description}
                />
            </div>

            <div className="gs-compact-toggle-label">
                {label}
            </div>

            {description && (
                <div className="gs-compact-toggle-description">
                    {description}
                </div>
            )}
        </div>
    );
};
/* =========================================================
   SETTINGS SECTION
   ========================================================= */

const SettingSection = ({
    title,
    children,
    className = "",
}) => {
    return (
        <section className={`gs-section ${className}`}>
            <div className="gs-section-header">
                {title}
            </div>

            <div className="gs-section-body">
                {children}
            </div>
        </section>
    );
};

/* =========================================================
   GENERAL SETUP PAGE
   ========================================================= */

const GeneralSetup1 = ({
    onSettingsSaved,
    isAdmin = false,
}) => {
    const API_URL = "http://localhost:5000/api";
    // const API_URL = "https://total-solution-backend.onrender.com/api";
    const [generalSetup, setGeneralSetup] =
        React.useState(() =>
            createDefaultGeneralSetup()
        );

    const [initialSetup, setInitialSetup] =
        React.useState(() =>
            createDefaultGeneralSetup()
        );

    const [saving, setSaving] =
        React.useState(false);
    const [loading, setLoading] =
        React.useState(true);

    const [message, setMessage] =
        React.useState("");
    const onSettingsSavedRef =
        React.useRef(onSettingsSaved);
    const [activeSetupMenu, setActiveSetupMenu] =
        React.useState("all");
        const [activeGeneralSetupPage, setActiveGeneralSetupPage] =
    React.useState("setup1");
    const [activeSetup2Menu, setActiveSetup2Menu] =
    React.useState("all");
    const [companyOptions, setCompanyOptions] =
        React.useState([]);

    const [companiesLoading, setCompaniesLoading] =
        React.useState(false);

    const [godownOptions, setGodownOptions] =
        React.useState([]);

    const [godownsLoading, setGodownsLoading] =
        React.useState(false);
    React.useEffect(() => {
        onSettingsSavedRef.current =
            onSettingsSaved;
    }, [onSettingsSaved]);


    const getSetupSession = () => {
        const distributorId = String(
            localStorage.getItem("distributorId") || ""
        ).trim();

        const firmId = String(
            localStorage.getItem("firmId") || ""
        ).trim();

        return {
            distributorId,
            firmId,
        };
    };
    /* =========================================================
   LOAD ACTIVE COMPANIES FOR DEFAULT COMPANY
========================================================= */

    const loadDefaultCompanyOptions =
        React.useCallback(async () => {
            const {
                distributorId,
                firmId,
            } = getSetupSession();

            if (!distributorId || !firmId) {
                setCompanyOptions([]);
                return;
            }

            try {
                setCompaniesLoading(true);

                const query =
                    new URLSearchParams({
                        distributorId,
                        firmId,
                    });

                const response =
                    await fetchWithTimeout(
                        `${API_URL}/companies?${query.toString()}`
                    );

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                const result =
                    contentType.includes(
                        "application/json"
                    )
                        ? await response.json()
                        : {
                            success: false,
                            message:
                                await response.text(),
                        };

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.message ||
                        "Unable to load companies."
                    );
                }

                const loadedCompanies =
                    Array.isArray(result.companies)
                        ? result.companies
                        : Array.isArray(result.data)
                            ? result.data
                            : [];

                const normalizedCompanies =
                    loadedCompanies
                        .map((company) => {
                            const companyCode =
                                String(
                                    company.companyCode ||
                                    company.code ||
                                    ""
                                ).trim();

                            const companyName =
                                String(
                                    company.companyName ||
                                    company.name ||
                                    ""
                                ).trim();

                            return {
                                ...company,
                                companyCode,
                                companyName,
                            };
                        })
                        .filter(
                            (company) =>
                                company.companyCode ||
                                company.companyName
                        )
                        .sort(
                            (
                                firstCompany,
                                secondCompany
                            ) =>
                                String(
                                    firstCompany.companyName ||
                                    firstCompany.companyCode
                                ).localeCompare(
                                    String(
                                        secondCompany.companyName ||
                                        secondCompany.companyCode
                                    ),
                                    undefined,
                                    {
                                        numeric: true,
                                        sensitivity: "base",
                                    }
                                )
                        );

                setCompanyOptions(
                    normalizedCompanies
                );
            } catch (error) {
                console.error(
                    "Default Company load error:",
                    error
                );

                setCompanyOptions([]);
            } finally {
                setCompaniesLoading(false);
            }
        }, []);
    /* =========================================================
LOAD ACTIVE GODOWNS FOR DEFAULT GODOWN
========================================================= */

    const loadDefaultGodownOptions =
        React.useCallback(async () => {
            const {
                distributorId,
                firmId,
            } = getSetupSession();

            if (!distributorId || !firmId) {
                setGodownOptions([]);
                return;
            }

            try {
                setGodownsLoading(true);

                const query =
                    new URLSearchParams({
                        distributorId,
                        firmId,
                    });

                const response =
                    await fetchWithTimeout(
                        `${API_URL}/godowns?${query.toString()}`
                    );

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                const result =
                    contentType.includes(
                        "application/json"
                    )
                        ? await response.json()
                        : {
                            success: false,
                            message:
                                await response.text(),
                        };

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.message ||
                        "Unable to load godowns."
                    );
                }

                const loadedGodowns =
                    Array.isArray(result.godowns)
                        ? result.godowns
                        : Array.isArray(result.data)
                            ? result.data
                            : [];

                const normalizedGodowns =
                    loadedGodowns
                        .map((godown) => {
                            const godownCode =
                                String(
                                    godown.godownCode ||
                                    godown.code ||
                                    ""
                                ).trim();

                            const godownName =
                                String(
                                    godown.godownName ||
                                    godown.name ||
                                    godownCode
                                ).trim();

                            return {
                                ...godown,
                                godownCode,
                                godownName,
                            };
                        })
                        .filter(
                            (godown) =>
                                godown.godownCode
                        )
                        .sort(
                            (
                                firstGodown,
                                secondGodown
                            ) =>
                                String(
                                    firstGodown.godownName
                                ).localeCompare(
                                    String(
                                        secondGodown.godownName
                                    ),
                                    undefined,
                                    {
                                        numeric: true,
                                        sensitivity: "base",
                                    }
                                )
                        );

                setGodownOptions(
                    normalizedGodowns
                );
            } catch (error) {
                console.error(
                    "Default Godown load error:",
                    error
                );

                setGodownOptions([]);
            } finally {
                setGodownsLoading(false);
            }
        }, []);
    const fetchWithTimeout = async (
        url,
        options = {},
        timeoutMs = 10000
    ) => {
        const controller =
            new AbortController();

        const timeoutId = window.setTimeout(
            () => controller.abort(),
            timeoutMs
        );

        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal,
            });
        } finally {
            window.clearTimeout(timeoutId);
        }
    };

    const normalizeSetupResponse = (result) => {
        const source =
            result?.setup ||
            result?.generalSetup ||
            result?.data ||
            result ||
            {};
        const validVatOnValues = [
            "GROSS_AMOUNT",
            "NET_AMOUNT",
            "GROSS_SCHEME",
            "GROSS_SCHEME_STAR",
            "GROSS_SCHEME_CASH",
            "GROSS_CASH",
        ];
        const validCashDiscountValues = [
            "BILL_NET_AMOUNT",
            "ITEM_WISE_GROSS",
            "ITEM_WISE_GROSS_SCHEME",
            "BILL_GROSS_AMOUNT",
            "BILL_GROSS_SCHEME_VAT",
        ];
        const validProductSelectionValues = [
            "PRODUCT_CODE",
            "COMPANY_PRODUCT_CODE",
            "SHORT_CODE",
            "LOCAL_PRODUCT_NAME",
            "EAN_NO",
            "PRODUCT_NAME",
        ];
        const normalizedDefaultCompany =
            String(
                source.defaultCompany ||
                ""
            ).trim();

        const normalizedVatOn =
            String(
                source.vatOn ||
                DEFAULT_VAT_ON
            )
                .trim()
                .toUpperCase();

        const normalizedCashDiscountOn =
            String(
                source.cashDiscountOn ||
                DEFAULT_CASH_DISCOUNT_ON
            )
                .trim()
                .toUpperCase();

        const normalizedProductSelectionOn =
            String(
                source.productSelectionOn ||
                DEFAULT_PRODUCT_SELECTION_ON
            )
                .trim()
                .toUpperCase();
        const normalizedDefaultGodown =
            String(
                source.defaultGodown ||
                ""
            ).trim();
        const normalizedDefaultSelection =
            String(
                source.defaultSelection ||
                DEFAULT_SELECTION
            )
                .trim()
                .toUpperCase();

        return {
            ...createDefaultGeneralSetup(),
            ...source,
            defaultSelection:
                DEFAULT_SELECTION_VALUES.includes(
                    normalizedDefaultSelection
                )
                    ? normalizedDefaultSelection
                    : DEFAULT_SELECTION,
            defaultGodown:
                normalizedDefaultGodown,
            vatOn:
                VAT_ON_VALUES.includes(
                    normalizedVatOn
                )
                    ? normalizedVatOn
                    : DEFAULT_VAT_ON,

            cashDiscountOn:
                CASH_DISCOUNT_ON_VALUES.includes(
                    normalizedCashDiscountOn
                )
                    ? normalizedCashDiscountOn
                    : DEFAULT_CASH_DISCOUNT_ON,

            productSelectionOn:
                PRODUCT_SELECTION_ON_VALUES.includes(
                    normalizedProductSelectionOn
                )
                    ? normalizedProductSelectionOn
                    : DEFAULT_PRODUCT_SELECTION_ON,
            defaultCompany:
                normalizedDefaultCompany,

            billAllowBlacklistParty:
                source.billAllowBlacklistParty === true ||
                source.billAllowBlacklistParty === "true" ||
                source.billAllowBlacklistParty === "Y" ||
                source.billAllowBlacklistParty === "YES",

            allowChangeBillType:
                source.allowChangeBillType === true ||
                source.allowChangeBillType === "true" ||
                source.allowChangeBillType === "Y" ||
                source.allowChangeBillType === "YES",
            defaultSalesman:
                source.defaultSalesman === true ||
                source.defaultSalesman === "true" ||
                source.defaultSalesman === "Y" ||
                source.defaultSalesman === "YES" ||
                source.defaultSalesman === 1,
            allowChangeSaleRate:
                source.allowChangeSaleRate === true ||
                source.allowChangeSaleRate === "true" ||
                source.allowChangeSaleRate === "Y" ||
                source.allowChangeSaleRate === "YES" ||
                source.allowChangeSaleRate === 1,
            allowMixBilling:
                source.allowMixBilling === true ||
                source.allowMixBilling === "true" ||
                source.allowMixBilling === "Y" ||
                source.allowMixBilling === "YES" ||
                source.allowMixBilling === 1,
            allowEditBillAfterLoad:
                source.allowEditBillAfterLoad === true ||
                source.allowEditBillAfterLoad === "true" ||
                source.allowEditBillAfterLoad === "Y" ||
                source.allowEditBillAfterLoad === "YES" ||
                source.allowEditBillAfterLoad === 1,
            editProductAfterLoad:
                source.editProductAfterLoad === true ||
                source.editProductAfterLoad === "true" ||
                source.editProductAfterLoad === "Y" ||
                source.editProductAfterLoad === "YES" ||
                source.editProductAfterLoad === 1,
        
            saveAndPrint:
                source.saveAndPrint === true ||
                source.saveAndPrint === "true" ||
                source.saveAndPrint === "Y" ||
                source.saveAndPrint === "YES" ||
                source.saveAndPrint === 1,
                allowSRateLessThanPRate:
    source.allowSRateLessThanPRate === true ||
    source.allowSRateLessThanPRate === "true" ||
    source.allowSRateLessThanPRate === "Y" ||
    source.allowSRateLessThanPRate === "YES" ||
    source.allowSRateLessThanPRate === 1,
    updateLoadQtyAfterBillEdit:
    source.updateLoadQtyAfterBillEdit === true ||
    source.updateLoadQtyAfterBillEdit === "true" ||
    source.updateLoadQtyAfterBillEdit === "Y" ||
    source.updateLoadQtyAfterBillEdit === "YES" ||
    source.updateLoadQtyAfterBillEdit === 1,
    allowNegativeStock:
  source.allowNegativeStock === true ||
  source.allowNegativeStock === "true" ||
  source.allowNegativeStock === "Y" ||
  source.allowNegativeStock === "YES" ||
  source.allowNegativeStock === 1,
  goodsReturn:
  source.goodsReturn === true ||
  source.goodsReturn === "true" ||
  source.goodsReturn === "Y" ||
  source.goodsReturn === "YES" ||
  source.goodsReturn === 1,
  allowCessInPurchase:
    source.allowCessInPurchase === true ||
    source.allowCessInPurchase === "true" ||
    source.allowCessInPurchase === "Y" ||
    source.allowCessInPurchase === "YES" ||
    source.allowCessInPurchase === 1,

allowCessInSale:
    source.allowCessInSale === true ||
    source.allowCessInSale === "true" ||
    source.allowCessInSale === "Y" ||
    source.allowCessInSale === "YES" ||
    source.allowCessInSale === 1,

reverseScheme:
    source.reverseScheme === true ||
    source.reverseScheme === "true" ||
    source.reverseScheme === "Y" ||
    source.reverseScheme === "YES" ||
    source.reverseScheme === 1,

editGrossPurchase:
    source.editGrossPurchase === true ||
    source.editGrossPurchase === "true" ||
    source.editGrossPurchase === "Y" ||
    source.editGrossPurchase === "YES" ||
    source.editGrossPurchase === 1,

importNegative:
    source.importNegative === true ||
    source.importNegative === "true" ||
    source.importNegative === "Y" ||
    source.importNegative === "YES" ||
    source.importNegative === 1,

allowChangeStarAmount:
    source.allowChangeStarAmount === true ||
    source.allowChangeStarAmount === "true" ||
    source.allowChangeStarAmount === "Y" ||
    source.allowChangeStarAmount === "YES" ||
    source.allowChangeStarAmount === 1,

settleLoadNegative:
    source.settleLoadNegative === true ||
    source.settleLoadNegative === "true" ||
    source.settleLoadNegative === "Y" ||
    source.settleLoadNegative === "YES" ||
    source.settleLoadNegative === 1,

qrCodeFolderName:
    String(
        source.qrCodeFolderName || ""
    ).trim(),

saleSeriesByGst:
    source.saleSeriesByGst === true ||
    source.saleSeriesByGst === "true" ||
    source.saleSeriesByGst === "Y" ||
    source.saleSeriesByGst === "YES" ||
    source.saleSeriesByGst === 1,

importWithZero:
    source.importWithZero === true ||
    source.importWithZero === "true" ||
    source.importWithZero === "Y" ||
    source.importWithZero === "YES" ||
    source.importWithZero === 1,

autoBillLockDays:
    Math.max(
        0,
        Number(source.autoBillLockDays || 0)
    ),

allowGstRate:
    source.allowGstRate === true ||
    source.allowGstRate === "true" ||
    source.allowGstRate === "Y" ||
    source.allowGstRate === "YES" ||
    source.allowGstRate === 1,
        };
    };

    const loadGeneralSetup =
        React.useCallback(async () => {
            const {
                distributorId,
                firmId,
            } = getSetupSession();

            if (!distributorId || !firmId) {
                setLoading(false);

                setMessage(
                    "Distributor or Firm information was not found. Please login again."
                );

                return;
            }

            try {
                setLoading(true);
                setMessage("");

                const query = new URLSearchParams({
                    distributorId,
                    firmId,
                });

                const response =
                    await fetchWithTimeout(
                        `${API_URL}/general-setup?${query.toString()}`
                    );

                const contentType =
                    response.headers.get("content-type") || "";

                const result =
                    contentType.includes("application/json")
                        ? await response.json()
                        : {
                            success: false,
                            message: await response.text(),
                        };

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.message ||
                        "Unable to load General Setup."
                    );
                }

                const loadedSetup =
                    normalizeSetupResponse(result);

                setGeneralSetup(loadedSetup);

                setInitialSetup({
                    ...loadedSetup,
                });

                if (
                    typeof onSettingsSavedRef.current ===
                    "function"
                ) {
                    onSettingsSavedRef.current(
                        loadedSetup
                    );
                }
                return loadedSetup;
            } catch (error) {
                console.error(
                    "General Setup load error:",
                    error

                );

                const errorMessage =
                    error?.name === "AbortError"
                        ? "The General Setup server did not respond within 10 seconds."
                        : error?.message ||
                        "Unable to load General Setup.";

                setMessage(errorMessage);
                return null;
            } finally {
                setLoading(false);
            }
        }, []);
    React.useEffect(() => {
        loadGeneralSetup();
    }, [loadGeneralSetup]);
    React.useEffect(() => {
        loadDefaultCompanyOptions();
    }, [loadDefaultCompanyOptions]);
    React.useEffect(() => {
        loadDefaultGodownOptions();
    }, [loadDefaultGodownOptions]);


    const updateSetting = (name, value) => {
        setGeneralSetup((previous) => ({
            ...previous,
            [name]: value,
        }));

        setMessage("");
    };

    const hasChanges =
        JSON.stringify(generalSetup) !==
        JSON.stringify(initialSetup);

    const handleReset = () => {
        const defaults =
            createDefaultGeneralSetup();

        setGeneralSetup(defaults);
        setMessage(
            "Default values restored. Click Save Changes to apply them."
        );
    };

    const handleSave = async () => {
        const {
            distributorId,
            firmId,
        } = getSetupSession();

        if (!distributorId || !firmId) {
            setMessage(
                "Distributor or Firm information was not found. Please login again."
            );

            return;
        }

        try {
            setSaving(true);
            setMessage("");
            const response =
                await fetchWithTimeout(
                    `${API_URL}/general-setup`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type": "application/json",
                        },

                        body: JSON.stringify({
                            distributorId,
                            firmId,

                            billAllowBlacklistParty:
                                Boolean(
                                    generalSetup.billAllowBlacklistParty
                                ),

                            allowChangeBillType:
                                Boolean(
                                    generalSetup.allowChangeBillType
                                ),

                            defaultSalesman:
                                Boolean(
                                    generalSetup.defaultSalesman
                                ),

                            allowChangeSaleRate:
                                Boolean(
                                    generalSetup.allowChangeSaleRate
                                ),

                            /*
                             * MIX BILLING
                             */
                            allowMixBilling:
                                Boolean(
                                    generalSetup.allowMixBilling
                                ),

                            saveInvoiceAfterLoad:
                                Boolean(
                                    generalSetup.saveInvoiceAfterLoad
                                ),

                            allowEditBillAfterLoad:
                                Boolean(
                                    generalSetup.allowEditBillAfterLoad
                                ),

                            editProductAfterLoad:
                                Boolean(
                                    generalSetup.editProductAfterLoad
                                ),

                            vatOn:
                                VAT_ON_VALUES.includes(
                                    String(
                                        generalSetup.vatOn ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase()
                                )
                                    ? String(
                                        generalSetup.vatOn
                                    )
                                        .trim()
                                        .toUpperCase()
                                    : DEFAULT_VAT_ON,

                            cashDiscountOn:
                                CASH_DISCOUNT_ON_VALUES.includes(
                                    String(
                                        generalSetup.cashDiscountOn ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase()
                                )
                                    ? String(
                                        generalSetup.cashDiscountOn
                                    )
                                        .trim()
                                        .toUpperCase()
                                    : DEFAULT_CASH_DISCOUNT_ON,

                            productSelectionOn:
                                PRODUCT_SELECTION_ON_VALUES.includes(
                                    String(
                                        generalSetup.productSelectionOn ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase()
                                )
                                    ? String(
                                        generalSetup.productSelectionOn
                                    )
                                        .trim()
                                        .toUpperCase()
                                    : DEFAULT_PRODUCT_SELECTION_ON,

                            defaultCompany:
                                String(
                                    generalSetup.defaultCompany ||
                                    ""
                                ).trim(),

                            defaultGodown:
                                String(
                                    generalSetup.defaultGodown ||
                                    ""
                                ).trim(),

                            defaultSelection:
                                DEFAULT_SELECTION_VALUES.includes(
                                    String(
                                        generalSetup.defaultSelection ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase()
                                )
                                    ? String(
                                        generalSetup.defaultSelection
                                    )
                                        .trim()
                                        .toUpperCase()
                                    : DEFAULT_SELECTION,

                            saveAndPrint:
                                Boolean(
                                    generalSetup.saveAndPrint
                                ),

                            allowSRateLessThanPRate:
                                Boolean(
                                    generalSetup.allowSRateLessThanPRate
                                ),

                            updateLoadQtyAfterBillEdit:
                                Boolean(
                                    generalSetup.updateLoadQtyAfterBillEdit
                                ),

                            allowNegativeStock:
                                Boolean(
                                    generalSetup.allowNegativeStock
                                ),

                            goodsReturn:
                                Boolean(
                                    generalSetup.goodsReturn
                                ),

                            damageReturn:
                                Boolean(
                                    generalSetup.damageReturn
                                ),

                            schemeSummary:
                                Boolean(
                                    generalSetup.schemeSummary
                                ),

                            vatSummary:
                                Boolean(
                                    generalSetup.vatSummary
                                ),

                            serialNo:
                                Boolean(
                                    generalSetup.serialNo
                                ),

                            autoVoucherNo:
                                Boolean(
                                    generalSetup.autoVoucherNo
                                ),

                            dateLocking:
                                generalSetup.dateLocking || "",

                            showEntryDays:
                                Number(
                                    generalSetup.showEntryDays || 0
                                ),

                            billingWithoutHsnCode:
                                Boolean(
                                    generalSetup.billingWithoutHsnCode
                                ),
                                allowCessInPurchase:
    Boolean(
        generalSetup.allowCessInPurchase
    ),

allowCessInSale:
    Boolean(
        generalSetup.allowCessInSale
    ),

reverseScheme:
    Boolean(
        generalSetup.reverseScheme
    ),

editGrossPurchase:
    Boolean(
        generalSetup.editGrossPurchase
    ),

importNegative:
    Boolean(
        generalSetup.importNegative
    ),

allowChangeStarAmount:
    Boolean(
        generalSetup.allowChangeStarAmount
    ),

settleLoadNegative:
    Boolean(
        generalSetup.settleLoadNegative
    ),

qrCodeFolderName:
    String(
        generalSetup.qrCodeFolderName || ""
    ).trim(),

saleSeriesByGst:
    Boolean(
        generalSetup.saleSeriesByGst
    ),

importWithZero:
    Boolean(
        generalSetup.importWithZero
    ),

autoBillLockDays:
    Math.max(
        0,
        Number(
            generalSetup.autoBillLockDays || 0
        )
    ),

allowGstRate:
    Boolean(
        generalSetup.allowGstRate
    ),
                        }),
                    },
                    10000
                );

            const contentType =
                response.headers.get("content-type") || "";

            const result =
                contentType.includes("application/json")
                    ? await response.json()
                    : {
                        success: false,
                        message: await response.text(),
                    };

            if (
                !response.ok ||
                result.success === false
            ) {
                throw new Error(
                    result.message ||
                    "Unable to save General Setup."
                );
            }

            /*
    * Reload the saved record from the database.
    * This prevents partial/stale API responses from
    * changing VAT On or Cash Discount On temporarily.
    */
            const savedSetup =
                await loadGeneralSetup();

            if (!savedSetup) {
                throw new Error(
                    "Settings were saved, but the saved values could not be reloaded."
                );
            }

            /*
 * Notify Dashboard.jsx immediately so runtime settings,
 * including Save and Print, update without refreshing.
 */
if (
    typeof onSettingsSavedRef.current ===
    "function"
) {
    onSettingsSavedRef.current(
        savedSetup
    );
}
            setMessage(
                "General Setup saved successfully."
            );
        } catch (error) {
            console.error(
                "General Setup load error:",
                error
            );

            const errorMessage =
                error?.name === "AbortError"
                    ? "The General Setup server did not respond within 10 seconds."
                    : error?.message ||
                    "Unable to load General Setup.";

            setMessage(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="general-setup-container">

                <div className="gs-access-denied">
                    <div className="gs-access-denied-icon">
                        🔒
                    </div>

                    <h2>Access Restricted</h2>

                    <p>
                        You are not authorized to view or change
                        General Setup.
                    </p>

                    <div className="gs-access-denied-note">
                        Only an Administrator can update
                        firm-wide system settings.
                    </div>
                </div>
            </div>
        );
    }
    const setupMenus = [
        {
            key: "all",
            label: "All Settings",
            icon: "▦",
        },
        {
            key: "general",
            label: "General",
            icon: "⚙",
        },
        {
            key: "billing",
            label: "Billing",
            icon: "▤",
        },
        {
            key: "inventory",
            label: "Inventory",
            icon: "▣",
        },
        {
            key: "accounts",
            label: "Accounts",
            icon: "▰",
        },
        {
            key: "gst",
            label: "GST",
            icon: "%",
        },
        {
            key: "printing",
            label: "Printing",
            icon: "▧",
        },
        {
            key: "system",
            label: "System",
            icon: "◉",
        },
    ];

    const setupOverviewCards = [
        {
            key: "general",
            title: "General",
            description: "Basic company and system preferences",
            count: 4,
            icon: "⚙",
            color: "purple",
        },
        {
            key: "billing",
            title: "Billing",
            description: "Invoice, billing and transaction preferences",
            count: 18,
            icon: "▤",
            color: "blue",
        },
        {
            key: "inventory",
            title: "Inventory",
            description: "Stock, godown and inventory preferences",
            count: 0,
            icon: "▣",
            color: "green",
        },
        {
            key: "accounts",
            title: "Accounts",
            description: "Accounting and financial preferences",
            count: 0,
            icon: "▰",
            color: "orange",
        },
        {
            key: "gst",
            title: "GST",
            description: "GST rates, rules and tax preferences",
            count: 0,
            icon: "%",
            color: "violet",
        },
        {
            key: "printing",
            title: "Printing",
            description: "Print formats and document layouts",
            count: 5,
            icon: "▧",
            color: "pink",
        },
        {
            key: "system",
            title: "Users & Security",
            description: "User roles, permissions and system security",
            count: 0,
            icon: "♙",
            color: "cyan",
        },
        {
            key: "system",
            title: "System",
            description: "System configuration and information",
            count: 3,
            icon: "▣",
            color: "slate",
        },
    ];
    /* =========================================================
   GENERAL SETUP 2 NAVIGATION
========================================================= */

const setup2Menus = [
    {
        key: "all",
        label: "All Settings",
        icon: "▦",
    },
    {
        key: "purchaseSales",
        label: "Purchase & Sales",
        icon: "▤",
    },
    {
        key: "importGst",
        label: "Import & GST",
        icon: "%",
    },
    {
        key: "system",
        label: "System",
        icon: "⚙",
    },
];

const setup2OverviewCards = [
    {
        key: "purchaseSales",
        title: "Purchase & Sales",
        description:
            "Cess, scheme, gross amount and sales-series preferences",
        count: 7,
        icon: "▤",
        color: "blue",
    },
    {
        key: "importGst",
        title: "Import & GST",
        description:
            "Negative imports, zero imports and GST-rate preferences",
        count: 3,
        icon: "%",
        color: "violet",
    },
    {
        key: "system",
        title: "System",
        description:
            "QR-code folder and automatic bill-locking preferences",
        count: 2,
        icon: "⚙",
        color: "slate",
    },
];

    const renderEmptyCategory = (
        title,
        description
    ) => (
        <div className="gs-empty-category">
            <div className="gs-empty-category-icon">
                ⚙
            </div>

            <h3>{title}</h3>

            <p>{description}</p>

            <span>
                Settings for this category can be added here.
            </span>
        </div>
    );
    /*
 * Do not render default values while the saved
 * General Setup is still loading from the database.
 */
    if (loading) {
        return (
            <div className="general-setup-container">
                <div
                    style={{
                        minHeight: "320px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: "10px",
                    }}
                >
                    <div className="gs-loading-spinner" />

                    <strong>
                        Loading General Setup...
                    </strong>

                    <span>
                        Please wait while saved settings are loaded.
                    </span>
                </div>
            </div>
        );
    }
    return (
        <div className="general-setup-container">
            {/* =====================================================
          PAGE TOOLBAR
          ===================================================== */}

            <div className="general-setup-toolbar">
                <div className="general-setup-heading">
                    <h1>General Setup</h1>

                    <p>
                        Configure system-wide billing and
                        transaction preferences.
                    </p>
                </div>

                <div className="general-setup-toolbar-actions">
                    <button
                        type="button"
                        className="gs-button gs-button-secondary"
                        onClick={handleReset}
                        disabled={loading || saving}
                    >
                        <span className="gs-button-icon">
                            ↶
                        </span>

                        Reset to Default
                    </button>

                    <button
                        type="button"
                        className="gs-button gs-button-primary"
                        onClick={handleSave}
                        disabled={
                            loading ||
                            saving ||
                            !hasChanges
                        }
                    >
                        <span className="gs-button-icon">
                            ▣
                        </span>

                        {loading
                            ? "Loading..."
                            : saving
                                ? "Saving..."
                                : "Save Changes"}
                    </button>
                </div>
            </div>

<div className="gs-page-tabs">
    <button
        type="button"
        className={`gs-page-tab ${
            activeGeneralSetupPage === "setup1"
                ? "is-active"
                : ""
        }`}
        onClick={() => {
            setActiveGeneralSetupPage("setup1");
            setActiveSetupMenu("all");
        }}
    >
        <span className="gs-page-tab-number">1</span>
        General Setup 1
    </button>

    <button
        type="button"
        className={`gs-page-tab ${
            activeGeneralSetupPage === "setup2"
                ? "is-active"
                : ""
        }`}
       onClick={() => {
    setActiveGeneralSetupPage("setup2");
    setActiveSetup2Menu("all");
}}
    >
        <span className="gs-page-tab-number">2</span>
        General Setup 2
    </button>
</div>
            {/* =====================================================
    SETUP CATEGORY NAVIGATION
===================================================== */}

       {activeGeneralSetupPage === "setup1" && (
    <div className="gs-category-navigation">
        {setupMenus.map((menu) => (
            <button
                key={menu.key}
                type="button"
                className={`gs-category-button ${
                    activeSetupMenu === menu.key
                        ? "is-active"
                        : ""
                }`}
                onClick={() =>
                    setActiveSetupMenu(menu.key)
                }
            >
                <span className="gs-category-button-icon">
                    {menu.icon}
                </span>

                <span>{menu.label}</span>
            </button>
        ))}
    </div>
)}
{activeGeneralSetupPage === "setup2" && (
    <div className="gs-category-navigation">
        {setup2Menus.map((menu) => (
            <button
                key={menu.key}
                type="button"
                className={`gs-category-button ${
                    activeSetup2Menu === menu.key
                        ? "is-active"
                        : ""
                }`}
                onClick={() =>
                    setActiveSetup2Menu(menu.key)
                }
            >
                <span className="gs-category-button-icon">
                    {menu.icon}
                </span>

                <span>{menu.label}</span>
            </button>
        ))}
    </div>
)}

{activeGeneralSetupPage === "setup1" && (
    <>

            {/* =====================================================
    ALL SETTINGS OVERVIEW
===================================================== */}

            {activeSetupMenu === "all" && (
                <>
                    <section className="gs-overview-panel">
                        <div className="gs-overview-header">
                            <div>
                                <h2>
                                    General Settings Overview
                                </h2>

                                <p>
                                    Manage all your business
                                    preferences in one place.
                                </p>
                            </div>
                        </div>

                        <div className="gs-overview-card-grid">
                            {setupOverviewCards.map(
                                (card, index) => (
                                    <button
                                        key={`${card.key}-${index}`}
                                        type="button"
                                        className="gs-overview-card"
                                        onClick={() =>
                                            setActiveSetupMenu(
                                                card.key
                                            )
                                        }
                                    >
                                        <span
                                            className={`gs-overview-card-icon ${card.color}`}
                                        >
                                            {card.icon}
                                        </span>

                                        <span className="gs-overview-card-content">
                                            <strong>
                                                {card.title}
                                            </strong>

                                            <small>
                                                {card.description}
                                            </small>

                                            <span className="gs-overview-card-count">
                                                {card.count > 0
                                                    ? `${card.count} Settings`
                                                    : "Coming Soon"}
                                            </span>
                                        </span>

                                        <span className="gs-overview-card-arrow">
                                            ›
                                        </span>
                                    </button>
                                )
                            )}
                        </div>
                    </section>

                    <section className="gs-quick-actions-panel">
                        <div className="gs-quick-actions-heading">
                            <span className="gs-quick-actions-icon">
                                ⚡
                            </span>

                            <div>
                                <h3>Quick Actions</h3>

                                <p>
                                    Frequently used setup options
                                </p>
                            </div>
                        </div>

                        <div className="gs-quick-actions-grid">
                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("general")
                                }
                            >
                                <span>▣</span>

                                <div>
                                    <strong>
                                        Auto Voucher Number
                                    </strong>

                                    <small>
                                        {generalSetup.autoVoucherNo
                                            ? "Enabled"
                                            : "Disabled"}
                                    </small>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("billing")
                                }
                            >
                                <span>%</span>

                                <div>
                                    <strong>
                                        GST Calculation
                                    </strong>

                                    <small>
                                        {generalSetup.vatOn
                                            ?.replaceAll("_", " ") ||
                                            "Gross Amount"}
                                    </small>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("billing")
                                }
                            >
                                <span>▣</span>

                                <div>
                                    <strong>
                                        Default Godown
                                    </strong>

                                    <small>
                                        {generalSetup.defaultGodown ||
                                            "Not selected"}
                                    </small>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("billing")
                                }
                            >
                                <span>#</span>

                                <div>
                                    <strong>
                                        Product Selection
                                    </strong>

                                    <small>
                                        {generalSetup.productSelectionOn
                                            ?.replaceAll("_", " ") ||
                                            "Product Name"}
                                    </small>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("printing")
                                }
                            >
                                <span>▧</span>

                                <div>
                                    <strong>
                                        Save and Print
                                    </strong>

                                    <small>
                                        {generalSetup.saveAndPrint
                                            ? "Enabled"
                                            : "Disabled"}
                                    </small>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="gs-quick-action"
                                onClick={() =>
                                    setActiveSetupMenu("printing")
                                }
                            >
                                <span>▤</span>

                                <div>
                                    <strong>
                                        Print Summary
                                    </strong>

                                    <small>
                                        {generalSetup.vatSummary
                                            ? "VAT Summary On"
                                            : "VAT Summary Off"}
                                    </small>
                                </div>
                            </button>
                        </div>
                    </section>
                </>
            )}

            {/* =====================================================
    GENERAL CATEGORY
===================================================== */}

            {activeSetupMenu === "general" && (
                <div className="gs-selected-category">
                    <div className="gs-selected-category-header">
                        <div>
                            <span className="gs-selected-category-icon">
                                ⚙
                            </span>

                            <div>
                                <h2>General Settings</h2>

                                <p>
                                    Basic voucher and transaction
                                    entry preferences.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gs-back-overview-button"
                            onClick={() =>
                                setActiveSetupMenu("all")
                            }
                        >
                            ← All Settings
                        </button>
                    </div>

                    <SettingSection title="GENERAL">
                        <SettingRow
                            label="Auto Voucher No"
                            description="Automatically generate voucher numbers."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.autoVoucherNo
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "autoVoucherNo",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Date Locking"
                            description="Prevent entries or edits before the selected date."
                        >
                            <input
                                type="date"
                                className="gs-control"
                                value={
                                    generalSetup.dateLocking
                                }
                                disabled={loading || saving}
                                onChange={(event) =>
                                    updateSetting(
                                        "dateLocking",
                                        event.target.value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Show Entry Days"
                            description="Number of previous days available for transaction entry."
                        >
                            <input
                                type="number"
                                min="0"
                                step="1"
                                className="gs-control"
                                value={
                                    generalSetup.showEntryDays
                                }
                                disabled={loading || saving}
                                onChange={(event) =>
                                    updateSetting(
                                        "showEntryDays",
                                        event.target.value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Billing Without HSN Code"
                            description="Allow saving bills when a product does not have an HSN code."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.billingWithoutHsnCode
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "billingWithoutHsnCode",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>
                </div>
            )}

            {/* =====================================================
    BILLING CATEGORY
===================================================== */}

            {activeSetupMenu === "billing" && (
                <div className="gs-selected-category gs-billing-category">
                    <div className="gs-selected-category-header">
                        <div>
                            <span className="gs-selected-category-icon billing">
                                ▤
                            </span>

                            <div>
                                <h2>Billing Settings</h2>
                                <p>
                                    Configure invoice, sales, stock and transaction preferences.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gs-back-overview-button"
                            onClick={() => setActiveSetupMenu("all")}
                        >
                            ← All Settings
                        </button>
                    </div>

                    <section className="gs-compact-settings-section">
                        <div className="gs-compact-section-header">
                            <div>
                                <h3>Billing Rules</h3>
                                <p>Enable or disable billing behaviour.</p>
                            </div>

                            <span className="gs-compact-section-count">
                                12 Switch Settings
                            </span>
                        </div>

                        <div className="gs-compact-toggle-grid">
                            <CompactToggleSetting
                                label="Blacklist Party Billing"
                                description="Allow billing for parties marked as blacklisted."
                                checked={generalSetup.billAllowBlacklistParty}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("billAllowBlacklistParty", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Change Bill Type"
                                description="Allow changing Credit or Cash bill type."
                                checked={generalSetup.allowChangeBillType}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowChangeBillType", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Default Salesman"
                                description="Automatically select the default salesman."
                                checked={generalSetup.defaultSalesman}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("defaultSalesman", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Change Sale Rate"
                                description="Allow users to manually change sale rate."
                                checked={generalSetup.allowChangeSaleRate}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowChangeSaleRate", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Mix Billing"
                                description="Allow products from multiple companies in one bill."
                                checked={generalSetup.allowMixBilling}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowMixBilling", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Save After Load"
                                description="Allow saving an invoice after load assignment."
                                checked={generalSetup.saveInvoiceAfterLoad}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("saveInvoiceAfterLoad", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Edit Bill After Load"
                                description="Allow editing bills assigned to a load."
                                checked={generalSetup.allowEditBillAfterLoad}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowEditBillAfterLoad", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Edit Product After Load"
                                description="Allow product rows to be edited after loading."
                                checked={generalSetup.editProductAfterLoad}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("editProductAfterLoad", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Save and Print"
                                description="Open print format automatically after saving."
                                checked={generalSetup.saveAndPrint}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("saveAndPrint", value)
                                }
                            />

                            <CompactToggleSetting
                                label="S.Rate Below P.Rate"
                                description="Allow sale rate below purchase rate."
                                checked={generalSetup.allowSRateLessThanPRate}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowSRateLessThanPRate", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Update Load Quantity"
                                description="Update load quantity after bill editing."
                                checked={generalSetup.updateLoadQtyAfterBillEdit}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("updateLoadQtyAfterBillEdit", value)
                                }
                            />

                            <CompactToggleSetting
                                label="Negative Stock"
                                description="Allow billing when stock becomes negative."
                                checked={generalSetup.allowNegativeStock}
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting("allowNegativeStock", value)
                                }
                            />
                        </div>
                    </section>

                    <section className="gs-compact-settings-section">
                        <div className="gs-compact-section-header">
                            <div>
                                <h3>Calculation and Default Settings</h3>
                                <p>Select calculation methods and default values.</p>
                            </div>

                            <span className="gs-compact-section-count">
                                6 Selection Settings
                            </span>
                        </div>

                        <div className="gs-compact-field-grid">
                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">VAT On</span>
                                <span className="gs-compact-field-help">
                                    GST calculation base
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.vatOn ||
                                        DEFAULT_VAT_ON
                                    }
                                    disabled={loading || saving}
                                    onChange={(event) =>
                                        updateSetting("vatOn", event.target.value)
                                    }
                                >
                                    <option value="GROSS_AMOUNT">
                                        Gross Amount
                                    </option>
                                    <option value="NET_AMOUNT">Net Amount</option>
                                    <option value="GROSS_SCHEME">Gross - Scheme</option>
                                    <option value="GROSS_SCHEME_STAR">
                                        Gross - Scheme - Star
                                    </option>
                                    <option value="GROSS_SCHEME_CASH">
                                        Gross - Scheme - Cash
                                    </option>
                                    <option value="GROSS_CASH">Gross - Cash</option>
                                </select>
                            </label>

                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">
                                    Cash Discount
                                </span>
                                <span className="gs-compact-field-help">
                                    Discount calculation base
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.cashDiscountOn ||
                                        DEFAULT_CASH_DISCOUNT_ON
                                    }
                                    disabled={loading || saving}
                                    onChange={(event) =>
                                        updateSetting(
                                            "cashDiscountOn",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="BILL_NET_AMOUNT">
                                        Bill Net Amount
                                    </option>
                                    <option value="ITEM_WISE_GROSS">
                                        Item Wise Gross
                                    </option>
                                    <option value="ITEM_WISE_GROSS_SCHEME">
                                        Item Wise Gross - Scheme
                                    </option>
                                    <option value="BILL_GROSS_AMOUNT">
                                        Bill Gross Amount
                                    </option>
                                    <option value="BILL_GROSS_SCHEME_VAT">
                                        Bill Gross - Scheme + VAT
                                    </option>
                                </select>
                            </label>

                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">
                                    Product Selection
                                </span>
                                <span className="gs-compact-field-help">
                                    Default search method
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.productSelectionOn ||
                                        DEFAULT_PRODUCT_SELECTION_ON
                                    }
                                    disabled={loading || saving}
                                    onChange={(event) =>
                                        updateSetting(
                                            "productSelectionOn",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="PRODUCT_CODE">
                                        Product Code Wise
                                    </option>

                                    <option value="COMPANY_PRODUCT_CODE">
                                        Company Product Code Wise
                                    </option>

                                    <option value="SHORT_CODE">
                                        Short Code Wise
                                    </option>

                                    <option value="LOCAL_PRODUCT_NAME">
                                        Local Product Name Wise
                                    </option>

                                    <option value="EAN_NO">
                                        EAN No. Wise
                                    </option>

                                    <option value="PRODUCT_NAME">
                                        Product Name Wise
                                    </option>
                                </select>
                            </label>

                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">
                                    Default Company
                                </span>

                                <span className="gs-compact-field-help">
                                    Selected automatically when billing opens
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.defaultCompany ||
                                        ""
                                    }
                                    disabled={
                                        loading ||
                                        saving ||
                                        companiesLoading
                                    }
                                    onChange={(event) =>
                                        updateSetting(
                                            "defaultCompany",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        {companiesLoading
                                            ? "Loading Companies..."
                                            : "Select Company"}
                                    </option>

                                    <option value="MIX">
                                        MIX BILLING
                                    </option>

                                    {companyOptions.map(
                                        (company) => {
                                            const companyCode =
                                                String(
                                                    company.companyCode ||
                                                    company.code ||
                                                    ""
                                                ).trim();

                                            const companyName =
                                                String(
                                                    company.companyName ||
                                                    company.name ||
                                                    companyCode
                                                ).trim();

                                            /*
                                             * Save company code because Billing
                                             * already works company-code-wise.
                                             */
                                            const optionValue =
                                                companyCode ||
                                                companyName;

                                            const optionLabel = [
                                                companyCode,
                                                companyName,
                                            ]
                                                .filter(Boolean)
                                                .join(" - ");

                                            return (
                                                <option
                                                    key={
                                                        company._id ||
                                                        optionValue
                                                    }
                                                    value={optionValue}
                                                >
                                                    {optionLabel ||
                                                        optionValue}
                                                </option>
                                            );
                                        }
                                    )}
                                </select>
                            </label>

                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">
                                    Default Godown
                                </span>

                                <span className="gs-compact-field-help">
                                    Selected automatically when billing opens
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.defaultGodown ||
                                        ""
                                    }
                                    disabled={
                                        loading ||
                                        saving ||
                                        godownsLoading
                                    }
                                    onChange={(event) =>
                                        updateSetting(
                                            "defaultGodown",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        {godownsLoading
                                            ? "Loading Godowns..."
                                            : "Select Godown"}
                                    </option>

                                    {godownOptions.map(
                                        (godown) => {
                                            const godownCode =
                                                String(
                                                    godown.godownCode ||
                                                    godown.code ||
                                                    ""
                                                ).trim();

                                            const godownName =
                                                String(
                                                    godown.godownName ||
                                                    godown.name ||
                                                    godownCode
                                                ).trim();

                                            if (!godownCode) {
                                                return null;
                                            }

                                            return (
                                                <option
                                                    key={
                                                        godown._id ||
                                                        godown.id ||
                                                        godownCode
                                                    }
                                                    value={godownCode}
                                                >
                                                    {godownName}
                                                </option>
                                            );
                                        }
                                    )}
                                </select>
                            </label>

                            <label className="gs-compact-field">
                                <span className="gs-compact-field-label">
                                    Default Selection
                                </span>
                                <span className="gs-compact-field-help">
                                    Default billing selection mode
                                </span>

                                <select
                                    className="gs-control"
                                    value={
                                        generalSetup.defaultSelection ||
                                        DEFAULT_SELECTION
                                    }
                                    disabled={loading || saving}
                                    onChange={(event) =>
                                        updateSetting(
                                            "defaultSelection",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="AREA">
                                        Area
                                    </option>

                                    <option value="ROUTE">
                                        Route
                                    </option>
                                </select>
                            </label>
                        </div>
                    </section>
                </div>
            )}

            {/* =====================================================
    PRINTING CATEGORY
===================================================== */}

            {activeSetupMenu === "printing" && (
                <div className="gs-selected-category">
                    <div className="gs-selected-category-header">
                        <div>
                            <span className="gs-selected-category-icon printing">
                                ▧
                            </span>

                            <div>
                                <h2>Printing Settings</h2>

                                <p>
                                    Configure bill print content and
                                    summaries.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gs-back-overview-button"
                            onClick={() =>
                                setActiveSetupMenu("all")
                            }
                        >
                            ← All Settings
                        </button>
                    </div>

                    <SettingSection title="BILL PRINT">
                        <SettingRow
                            label="Goods Return"
                            description="Show Goods Return information in the bill print."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.goodsReturn
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "goodsReturn",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Damage Return"
                            description="Show Damage Return information in the bill print."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.damageReturn
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "damageReturn",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Scheme Summary"
                            description="Show scheme summary in the bill print."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.schemeSummary
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "schemeSummary",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="VAT Summary"
                            description="Show tax summary in the bill print."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.vatSummary
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "vatSummary",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Serial No"
                            description="Show serial numbers in printed product rows."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.serialNo
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "serialNo",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>
                </div>
            )}

            {/* =====================================================
    SYSTEM CATEGORY
===================================================== */}

            {activeSetupMenu === "system" && (
                <div className="gs-selected-category">
                    <div className="gs-selected-category-header">
                        <div>
                            <span className="gs-selected-category-icon system">
                                ◉
                            </span>

                            <div>
                                <h2>System Settings</h2>

                                <p>
                                    Current user, firm and database
                                    information.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gs-back-overview-button"
                            onClick={() =>
                                setActiveSetupMenu("all")
                            }
                        >
                            ← All Settings
                        </button>
                    </div>

                    <section className="gs-system-card">
                        <div className="gs-system-card-title">
                            SYSTEM INFORMATION
                        </div>

                        <div className="gs-system-row">
                            <span>Logged In User</span>

                            <strong>
                                {localStorage.getItem(
                                    "userName"
                                ) ||
                                    localStorage.getItem(
                                        "username"
                                    ) ||
                                    "Administrator"}
                            </strong>
                        </div>

                        <div className="gs-system-row">
                            <span>Firm</span>

                            <strong>
                                {localStorage.getItem(
                                    "firmName"
                                ) || "Current Firm"}
                            </strong>
                        </div>

                        <div className="gs-system-row">
                            <span>Database</span>

                            <strong className="gs-connected-status">
                                <span className="gs-connected-dot" />
                                Connected
                            </strong>
                        </div>
                    </section>
                </div>
            )}

            {/* =====================================================
    EMPTY FUTURE CATEGORIES
===================================================== */}

            {activeSetupMenu === "inventory" &&
                renderEmptyCategory(
                    "Inventory Settings",
                    "Configure stock, godown and inventory-related preferences."
                )}

            {activeSetupMenu === "accounts" &&
                renderEmptyCategory(
                    "Accounts Settings",
                    "Configure financial, ledger and accounting preferences."
                )}

            {activeSetupMenu === "gst" &&
                renderEmptyCategory(
                    "GST Settings",
                    "Configure GST calculation, tax rates and return preferences."
                )}

 </>
)}

{activeGeneralSetupPage === "setup2" && (
    <>
        {/* =====================================================
            GENERAL SETUP 2 OVERVIEW
        ===================================================== */}

        {activeSetup2Menu === "all" && (
            <>
                <section className="gs-overview-panel">
                    <div className="gs-overview-header">
                        <div>
                            <h2>
                                General Setup 2 Overview
                            </h2>

                            <p>
                                Manage purchase, sales, import,
                                GST and system preferences in one place.
                            </p>
                        </div>
                    </div>

                    <div className="gs-overview-card-grid">
                        {setup2OverviewCards.map(
                            (card) => (
                                <button
                                    key={card.key}
                                    type="button"
                                    className="gs-overview-card"
                                    onClick={() =>
                                        setActiveSetup2Menu(
                                            card.key
                                        )
                                    }
                                >
                                    <span
                                        className={`gs-overview-card-icon ${card.color}`}
                                    >
                                        {card.icon}
                                    </span>

                                    <span className="gs-overview-card-content">
                                        <strong>
                                            {card.title}
                                        </strong>

                                        <small>
                                            {card.description}
                                        </small>

                                        <span className="gs-overview-card-count">
                                            {card.count} Settings
                                        </span>
                                    </span>

                                    <span className="gs-overview-card-arrow">
                                        ›
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </section>

                {/* =====================================================
                    GENERAL SETUP 2 QUICK ACTIONS
                ===================================================== */}

                <section className="gs-quick-actions-panel">
                    <div className="gs-quick-actions-heading">
                        <span className="gs-quick-actions-icon">
                            ⚡
                        </span>

                        <div>
                            <h3>Quick Actions</h3>

                            <p>
                                Frequently used General Setup 2 options
                            </p>
                        </div>
                    </div>

                    <div className="gs-quick-actions-grid">
                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "purchaseSales"
                                )
                            }
                        >
                            <span>%</span>

                            <div>
                                <strong>
                                    Cess in Purchase
                                </strong>

                                <small>
                                    {generalSetup.allowCessInPurchase
                                        ? "Enabled"
                                        : "Disabled"}
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "purchaseSales"
                                )
                            }
                        >
                            <span>▤</span>

                            <div>
                                <strong>
                                    Cess in Sale
                                </strong>

                                <small>
                                    {generalSetup.allowCessInSale
                                        ? "Enabled"
                                        : "Disabled"}
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "purchaseSales"
                                )
                            }
                        >
                            <span>↶</span>

                            <div>
                                <strong>
                                    Reverse Scheme
                                </strong>

                                <small>
                                    {generalSetup.reverseScheme
                                        ? "Enabled"
                                        : "Disabled"}
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "importGst"
                                )
                            }
                        >
                            <span>⇩</span>

                            <div>
                                <strong>
                                    Import Negative
                                </strong>

                                <small>
                                    {generalSetup.importNegative
                                        ? "Enabled"
                                        : "Disabled"}
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "system"
                                )
                            }
                        >
                            <span>▣</span>

                            <div>
                                <strong>
                                    QR Code Folder
                                </strong>

                                <small>
                                    {generalSetup.qrCodeFolderName ||
                                        "Not selected"}
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className="gs-quick-action"
                            onClick={() =>
                                setActiveSetup2Menu(
                                    "system"
                                )
                            }
                        >
                            <span>◷</span>

                            <div>
                                <strong>
                                    Auto Bill Lock
                                </strong>

                                <small>
                                    {Number(
                                        generalSetup.autoBillLockDays ||
                                        0
                                    )}{" "}
                                    Days
                                </small>
                            </div>
                        </button>
                    </div>
                </section>
            </>
        )}

        {/* =====================================================
            PURCHASE AND SALES SETTINGS
        ===================================================== */}

        {activeSetup2Menu === "purchaseSales" && (
            <div className="gs-selected-category gs-billing-category">
                <div className="gs-selected-category-header">
                    <div>
                        <span className="gs-selected-category-icon billing">
                            ▤
                        </span>

                        <div>
                            <h2>
                                Purchase & Sales Settings
                            </h2>

                            <p>
                                Configure cess, scheme, gross editing
                                and sales-series preferences.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="gs-back-overview-button"
                        onClick={() =>
                            setActiveSetup2Menu("all")
                        }
                    >
                        ← All Settings
                    </button>
                </div>

                <section className="gs-compact-settings-section">
                    <div className="gs-compact-section-header">
                        <div>
                            <h3>
                                PURCHASE AND SALES
                            </h3>

                            <p>
                                Transaction calculation and editing controls.
                            </p>
                        </div>

                        <span className="gs-compact-section-count">
                            7 Settings
                        </span>
                    </div>

                    <div className="gs-compact-toggle-grid">
                        <CompactToggleSetting
                            label="Allow Cess in Purchase"
                            description="Allow cess calculation in purchase entries."
                            checked={
                                generalSetup.allowCessInPurchase
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "allowCessInPurchase",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Allow Cess in Sale"
                            description="Allow cess calculation in sales billing."
                            checked={
                                generalSetup.allowCessInSale
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "allowCessInSale",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Reverse Scheme"
                            description="Apply scheme amount using reverse calculation."
                            checked={
                                generalSetup.reverseScheme
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "reverseScheme",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Edit Gross (Purchase)"
                            description="Allow gross amount editing in purchase."
                            checked={
                                generalSetup.editGrossPurchase
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "editGrossPurchase",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Allow Change Star Amount"
                            description="Allow modification of the calculated star amount."
                            checked={
                                generalSetup.allowChangeStarAmount
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "allowChangeStarAmount",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Settle Load Negative"
                            description="Allow negative values while settling load."
                            checked={
                                generalSetup.settleLoadNegative
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "settleLoadNegative",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Sale Series by GST"
                            description="Choose sales series according to GST."
                            checked={
                                generalSetup.saleSeriesByGst
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "saleSeriesByGst",
                                    value
                                )
                            }
                        />
                    </div>
                </section>
            </div>
        )}

        {/* =====================================================
            IMPORT AND GST SETTINGS
        ===================================================== */}

        {activeSetup2Menu === "importGst" && (
            <div className="gs-selected-category">
                <div className="gs-selected-category-header">
                    <div>
                        <span className="gs-selected-category-icon">
                            %
                        </span>

                        <div>
                            <h2>
                                Import & GST Settings
                            </h2>

                            <p>
                                Configure import validation and
                                GST-rate modification preferences.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="gs-back-overview-button"
                        onClick={() =>
                            setActiveSetup2Menu("all")
                        }
                    >
                        ← All Settings
                    </button>
                </div>

                <section className="gs-compact-settings-section">
                    <div className="gs-compact-section-header">
                        <div>
                            <h3>IMPORT AND GST</h3>

                            <p>
                                Import-value and tax-rate controls.
                            </p>
                        </div>

                        <span className="gs-compact-section-count">
                            3 Settings
                        </span>
                    </div>

                    <div className="gs-compact-toggle-grid">
                        <CompactToggleSetting
                            label="Import Negative"
                            description="Allow importing negative-value records."
                            checked={
                                generalSetup.importNegative
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "importNegative",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Import With Zero"
                            description="Allow importing zero-value records."
                            checked={
                                generalSetup.importWithZero
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "importWithZero",
                                    value
                                )
                            }
                        />

                        <CompactToggleSetting
                            label="Allow GST Rate"
                            description="Allow GST-rate modification during transactions."
                            checked={
                                generalSetup.allowGstRate
                            }
                            disabled={loading || saving}
                            onChange={(value) =>
                                updateSetting(
                                    "allowGstRate",
                                    value
                                )
                            }
                        />
                    </div>
                </section>
            </div>
        )}

        {/* =====================================================
            GENERAL SETUP 2 SYSTEM SETTINGS
        ===================================================== */}

        {activeSetup2Menu === "system" && (
            <div className="gs-selected-category">
                <div className="gs-selected-category-header">
                    <div>
                        <span className="gs-selected-category-icon system">
                            ⚙
                        </span>

                        <div>
                            <h2>System Settings</h2>

                            <p>
                                Configure the QR-code folder and
                                automatic bill-locking period.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="gs-back-overview-button"
                        onClick={() =>
                            setActiveSetup2Menu("all")
                        }
                    >
                        ← All Settings
                    </button>
                </div>

                <section className="gs-compact-settings-section">
                    <div className="gs-compact-section-header">
                        <div>
                            <h3>
                                FOLDER AND BILL LOCKING
                            </h3>

                            <p>
                                File-storage and transaction-lock controls.
                            </p>
                        </div>

                        <span className="gs-compact-section-count">
                            2 Settings
                        </span>
                    </div>

                    <div className="gs-compact-field-grid">
                        <label className="gs-compact-field">
                            <span className="gs-compact-field-label">
                                QR Code Folder Name
                            </span>

                            <span className="gs-compact-field-help">
                                Folder used to store generated QR-code files.
                            </span>

                            <input
                                type="text"
                                className="gs-control"
                                value={
                                    generalSetup.qrCodeFolderName ||
                                    ""
                                }
                                disabled={loading || saving}
                                maxLength={100}
                                placeholder="Example: QRCodes"
                                onChange={(event) =>
                                    updateSetting(
                                        "qrCodeFolderName",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="gs-compact-field">
                            <span className="gs-compact-field-label">
                                Auto Bill Lock Days
                            </span>

                            <span className="gs-compact-field-help">
                                Automatically lock bills after the entered days.
                            </span>

                            <input
                                type="number"
                                className="gs-control"
                                min="0"
                                step="1"
                                value={
                                    generalSetup.autoBillLockDays ??
                                    0
                                }
                                disabled={loading || saving}
                                onChange={(event) =>
                                    updateSetting(
                                        "autoBillLockDays",
                                        Math.max(
                                            0,
                                            Number(
                                                event.target.value ||
                                                0
                                            )
                                        )
                                    )
                                }
                            />
                        </label>
                    </div>
                </section>
            </div>
        )}
    </>
)}
            {/* =====================================================
          PAGE FOOTER MESSAGE
          ===================================================== */}

            <div
                className={`general-setup-footer ${hasChanges ? "has-changes" : ""
                    }`}
            >
                <span className="general-setup-footer-icon">
                    i
                </span>

                <span>
                    {message ||
                        (hasChanges
                            ? "You have unsaved changes. Click Save Changes to apply them across the system."
                            : "General Setup values will be applied across the system after saving.")}
                </span>
            </div>
        </div>
    );
};

export default GeneralSetup1;