import React from "react";
import { Settings, Building2, Calculator, ClipboardList, Tags, SlidersHorizontal } from "lucide-react";
import { API_URL } from "./api/config";
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
    const [generalSetup, setGeneralSetup] =
        React.useState(() =>
            createDefaultGeneralSetup()
        );

    const [initialSetup, setInitialSetup] =
        React.useState(() =>
            createDefaultGeneralSetup()
        );

    const [search, setSearch] = React.useState("");
    const [saving, setSaving] =
        React.useState(false);
    const [loading, setLoading] =
        React.useState(true);

    const [message, setMessage] =
        React.useState("");
    const onSettingsSavedRef =
        React.useRef(onSettingsSaved);
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
    const controller = new AbortController();

    const timeoutId = window.setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {

        const headers = {
            ...(options.headers || {}),
        };

        return await fetch(url, {
            ...options,
            headers,
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
    if (loading) {
        return <div className="erp-loading-state" role="status"><div className="erp-loading-bar" aria-hidden="true" />Loading General Setup...</div>;
    }

    const settings = [
        ["billAllowBlacklistParty", "Bill Allow BlackList Party"],
        ["allowChangeBillType", "Allow Change Bill Type"],
        ["defaultSalesman", "Default Salesman", "On: use the mapped salesman by default; you can change it on the sales bill."],
        ["allowChangeSaleRate", "Allow Change Sales Rate"],
        ["allowMixBilling", "Allow Mix Billing"],
        ["allowEditBillAfterLoad", "Allow Edit Bill After Load"],
        ["editProductAfterLoad", "Edit Product After Load"],
        ["saveAndPrint", "Save and Print"],
        ["allowSRateLessThanPRate", "Allow S.Rate Less Than P.Rate"],
        ["updateLoadQtyAfterBillEdit", "Update Load Qty After Bill Edit"],
        ["allowNegativeStock", "Allow Negative Stock"],
        ["serialNo", "Serial No"],
        ["billingWithoutHsnCode", "Billing Without HSN Code"],
        ["autoVoucherNo", "Auto Voucher No"],
        ["dateLocking", "Date Locking", "", "date"],
        ["showEntryDays", "Show Entry Days", "", "number"],
        ["vatOn", "VAT On", "", "select", [["GROSS_AMOUNT", "Gross Amount"], ["NET_AMOUNT", "Net Amount"], ["GROSS_SCHEME", "Gross - Scheme"], ["GROSS_SCHEME_STAR", "Gross - Scheme - Star"], ["GROSS_SCHEME_CASH", "Gross - Scheme - Cash"], ["GROSS_CASH", "Gross - Cash"]]],
        ["cashDiscountOn", "Cash Discount", "", "select", [["BILL_NET_AMOUNT", "Bill Net Amount"], ["ITEM_WISE_GROSS", "Item Wise Gross"], ["ITEM_WISE_GROSS_SCHEME", "Item Wise Gross - Scheme"], ["BILL_GROSS_AMOUNT", "Bill Gross Amount"], ["BILL_GROSS_SCHEME_VAT", "Bill Gross - Scheme + VAT"]]],
        ["productSelectionOn", "Product Selection On", "", "select", [["PRODUCT_CODE", "Product Code Wise"], ["COMPANY_PRODUCT_CODE", "Company Product Code Wise"], ["SHORT_CODE", "Short Code Wise"], ["LOCAL_PRODUCT_NAME", "Local Product Name Wise"], ["EAN_NO", "EAN No. Wise"], ["PRODUCT_NAME", "Product Name Wise"]]],
        ["defaultCompany", "Default Company", "", "company"],
        ["defaultGodown", "Default GoDown", "", "godown"],
        ["defaultSelection", "Default Selection", "", "select", [["AREA", "Area"], ["ROUTE", "Route"]]],
        ["allowCessInPurchase", "Allow Cess in Purchase"],
        ["allowCessInSale", "Allow Cess in Sale"],
        ["reverseScheme", "Reverse Scheme"],
        ["editGrossPurchase", "Edit Gross (Purchase)"],
        ["importNegative", "Import Negative"],
        ["allowChangeStarAmount", "Allow Change Star Amount"],
        ["settleLoadNegative", "Settle Load Negative"],
        ["allowGstRate", "Allow GST Rate"],
        ["qrCodeFolderName", "QR Code Folder Name", "", "text"],
        ["autoBillLockDays", "Auto Bill Lock Days", "", "number"],
    ];
    const groups = [
        { title: "Company & Defaults", icon: Building2, className: "gs-group-defaults", keys: ["defaultCompany", "defaultGodown", "defaultSelection", "defaultSalesman", "billAllowBlacklistParty", "productSelectionOn"] },
        { title: "Billing & Taxation", icon: Calculator, keys: ["allowChangeSaleRate", "vatOn", "billingWithoutHsnCode", "allowEditBillAfterLoad", "allowChangeStarAmount", "editGrossPurchase"] },
        { title: "Billing Calculations & Invoice Behavior", icon: ClipboardList, className: "gs-group-billing", keys: ["allowChangeBillType", "allowMixBilling", "cashDiscountOn", "allowSRateLessThanPRate", "editProductAfterLoad", "allowCessInSale", "reverseScheme", "saveAndPrint", "allowNegativeStock"] },
        { title: "Voucher & Load", icon: Tags, keys: ["autoVoucherNo", "autoBillLockDays", "settleLoadNegative", "updateLoadQtyAfterBillEdit", "allowCessInPurchase"] },
        { title: "Other Settings", icon: SlidersHorizontal, className: "gs-group-other", keys: ["dateLocking", "serialNo", "allowGstRate", "showEntryDays", "qrCodeFolderName", "importNegative"] },
    ];
    const query = search.trim().toLowerCase();
    const visibleSettings = settings.filter(([, label, description]) =>
        (label + " " + (description || "")).toLowerCase().includes(query)
    );
    const visibleByKey = new Map(visibleSettings.map((setting) => [setting[0], setting]));
    const disabled = loading || saving;
    return (
        <div className="general-setup-container gs-single">
            <div className="gs-single-toolbar">
                <h1><Settings aria-hidden="true" /> General Setup</h1>
                <div className="gs-single-actions">
                    <input type="search" className="gs-single-search" aria-label="Search settings" placeholder="Search settings..." value={search} onChange={(event) => setSearch(event.target.value)} />
                    <button type="button" className="gs-button gs-button-primary" onClick={handleSave} disabled={disabled || !hasChanges}>{saving ? <><span className="erp-loading-bar erp-loading-bar--inline" aria-hidden="true" /> Saving...</> : "Save Changes"}</button>
                    <button type="button" className="gs-button gs-button-secondary" onClick={() => { setGeneralSetup(initialSetup); setMessage(""); }} disabled={disabled || !hasChanges}>Cancel</button>
                    <button type="button" className="gs-button gs-button-secondary" onClick={handleReset} disabled={disabled}>Reset to Default</button>
                </div>
            </div>
            <div className="gs-groups">
                {groups.map(({ title, icon: Icon, className, keys }) => {
                    const items = keys.map((key) => visibleByKey.get(key)).filter(Boolean);
                    if (!items.length) return null;
                    return <section className={`gs-group ${className || ""}`} key={title}>
                        <h2><Icon aria-hidden="true" />{title}</h2>
                        <div className="gs-group-body" tabIndex={className === "gs-group-billing" ? 0 : undefined} role={className === "gs-group-billing" ? "region" : undefined} aria-label={className === "gs-group-billing" ? title : undefined}>
                {items.map(([key, label, description, type, options]) => {
                    const value = generalSetup[key];
                    let control;
                    if (!type) {
                        control = <button type="button" role="switch" aria-label={label} aria-checked={Boolean(value)} disabled={disabled} className={`gs-single-switch ${value ? "is-on" : "is-off"}`} onClick={() => updateSetting(key, !value)}><span className="gs-single-switch-thumb" /></button>;
                    } else if (type === "select" || type === "company" || type === "godown") {
                        let choices = options || [];
                        if (type === "company") choices = [["", companiesLoading ? "Loading Companies..." : "Select Company"], ["MIX", "MIX BILLING"], ...companyOptions.map((item) => [item.companyCode || item.companyName, [item.companyCode, item.companyName].filter(Boolean).join(" - ")])];
                        if (type === "godown") choices = [["", godownsLoading ? "Loading Godowns..." : "Select Godown"], ...godownOptions.filter((item) => item.godownCode || item.code).map((item) => [item.godownCode || item.code, item.godownName || item.name || item.godownCode])];
                        control = <select id={`gs-${key}`} className="gs-single-control" value={value || ""} disabled={disabled || (type === "company" && companiesLoading) || (type === "godown" && godownsLoading)} onChange={(event) => updateSetting(key, event.target.value)}>{choices.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select>;
                    } else {
                        control = <input id={`gs-${key}`} className="gs-single-control" type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? 1 : undefined} maxLength={type === "text" ? 100 : undefined} value={value ?? ""} disabled={disabled} onChange={(event) => updateSetting(key, key === "autoBillLockDays" ? Math.max(0, Number(event.target.value || 0)) : event.target.value)} />;
                    }
                    return <div className="gs-single-row" key={key}><div className="gs-single-label" title={description || undefined}><label htmlFor={type ? `gs-${key}` : undefined}>{label}:</label></div>{control}</div>;
                })}
                        </div>
                    </section>;
                })}
            </div>
            {visibleSettings.length === 0 && <p>No settings match your search.</p>}
            <div className={`general-setup-footer ${hasChanges ? "has-changes" : ""}`} role="status">{message || (hasChanges ? "You have unsaved changes. Click Save Changes to apply them." : "Changes apply after saving.")}</div>
        </div>
    );
};

export default GeneralSetup1;
