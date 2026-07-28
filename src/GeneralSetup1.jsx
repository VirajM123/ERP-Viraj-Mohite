import React from "react";
import "./GeneralSetup1.css";

/* =========================================================
   DEFAULT GENERAL SETUP VALUES
   ========================================================= */

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

    vatOn: "NET_AMOUNT",
    cashDiscountOn: "BILL_NET_AMOUNT",
    productSelectionOn: "PRODUCT_CODE",

    defaultCompany: "",
    defaultGodown: "",
    defaultSelection: "ROUTE",

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

    /* General */
    autoVoucherNo: true,
    dateLocking: "",
    showEntryDays: "10",
    billingWithoutHsnCode: false,
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
    const API_URL =
        "http://localhost:5000/api";

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

        const normalizedCashDiscountOn =
            String(
                source.cashDiscountOn ||
                "BILL_NET_AMOUNT"
            )
                .trim()
                .toUpperCase();

        const normalizedVatOn =
            String(
                source.vatOn ||
                "NET_AMOUNT"
            )
                .trim()
                .toUpperCase();

        return {
            ...createDefaultGeneralSetup(),
            ...source,
            vatOn:
                validVatOnValues.includes(
                    normalizedVatOn
                )
                    ? normalizedVatOn
                    : "NET_AMOUNT",

            cashDiscountOn:
                validCashDiscountValues.includes(
                    normalizedCashDiscountOn
                )
                    ? normalizedCashDiscountOn
                    : "BILL_NET_AMOUNT",

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
            billAllowBlacklistParty:
                source.billAllowBlacklistParty === true ||
                source.billAllowBlacklistParty === "true" ||
                source.billAllowBlacklistParty === "Y" ||
                source.billAllowBlacklistParty === "YES",
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
                                String(
                                    generalSetup.vatOn ||
                                    "NET_AMOUNT"
                                )
                                    .trim()
                                    .toUpperCase(),
                            cashDiscountOn:
  String(
    generalSetup.cashDiscountOn ||
    "BILL_NET_AMOUNT"
  )
    .trim()
    .toUpperCase(),

                            productSelectionOn:
                                generalSetup.productSelectionOn,

                            defaultCompany:
                                generalSetup.defaultCompany,

                            defaultGodown:
                                generalSetup.defaultGodown,

                            defaultSelection:
                                generalSetup.defaultSelection,

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

            {/* =====================================================
          MAIN SETTINGS GRID
          ===================================================== */}

            <div className="general-setup-grid">
                {/* ===================================================
            COLUMN 1 — SALES
            =================================================== */}

                <div className="gs-column">
                    <SettingSection title="SALES">
                        <SettingRow
                            label="Bill Allow Blacklist Party"
                            description="Allow billing for parties marked as blacklisted."
                        >
                            <ToggleSwitch

                                checked={
                                    generalSetup.billAllowBlacklistParty
                                }
                                disabled={loading || saving}
                                onChange={(value) =>
                                    updateSetting(
                                        "billAllowBlacklistParty",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow Change Bill Type"
                            description="Allow changing Credit or Cash bill type during billing."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowChangeBillType
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowChangeBillType",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Default Salesman"
                            description="Automatically select the default salesman in billing."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.defaultSalesman
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "defaultSalesman",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow Change Sale Rate"
                            description="Allow users to manually change the product sale rate."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowChangeSaleRate
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowChangeSaleRate",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow Mix Billing"
                            description="Allow products from multiple companies in one bill."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowMixBilling
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowMixBilling",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Save Invoice After Load"
                            description="Allow saving an invoice after it has been assigned to a load."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.saveInvoiceAfterLoad
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "saveInvoiceAfterLoad",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow Edit Bill After Load"
                            description="Allow editing bills already assigned to a load."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowEditBillAfterLoad
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowEditBillAfterLoad",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>
                </div>

                {/* ===================================================
            COLUMN 2 — BILLING / TRANSACTION
            =================================================== */}

                <div className="gs-column">
                    <SettingSection title="BILLING / TRANSACTION">
                        <SettingRow
                            label="Edit Product After Load"
                            description="Allow product rows to be edited after the bill is loaded."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.editProductAfterLoad
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "editProductAfterLoad",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="VAT On"
                            description="Select the amount on which GST/VAT should be calculated."
                        >
                            <select
                                className="gs-control"
                                value={generalSetup.vatOn || "NET_AMOUNT"}
                                disabled={loading || saving}
                                onChange={(event) =>
                                    updateSetting(
                                        "vatOn",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="NET_AMOUNT">
                                    Net Amount
                                </option>

                                <option value="GROSS_SCHEME">
                                    Gross - Scheme
                                </option>

                                <option value="GROSS_SCHEME_STAR">
                                    Gross - Scheme - Star
                                </option>

                                <option value="GROSS_SCHEME_CASH">
                                    Gross - Scheme - Cash
                                </option>

                                <option value="GROSS_CASH">
                                    Gross - Cash
                                </option>
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Cash Discount"
                            description="Select the amount on which cash discount should be calculated."
                        >
                            <select
                                className="gs-control"
                                value={
                                    generalSetup.cashDiscountOn ||
                                    "BILL_NET_AMOUNT"
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
                        </SettingRow>

                        <SettingRow
                            label="Product Selection On"
                            description="Choose the default product search method."
                        >
                            <select
                                className="gs-control"
                                value={
                                    generalSetup.productSelectionOn
                                }
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

                                <option value="PRODUCT_NAME">
                                    Product Name Wise
                                </option>

                                <option value="BARCODE">
                                    Barcode Wise
                                </option>
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Default Company"
                            description="Company automatically selected when opening Billing."
                        >
                            <select
                                className="gs-control"
                                value={
                                    generalSetup.defaultCompany
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "defaultCompany",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select Company
                                </option>

                                <option value="ALL">
                                    All Companies
                                </option>

                                {/*
                  Company Master options will be loaded
                  from the backend later.
                */}
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Default Godown"
                            description="Godown automatically selected when opening Billing."
                        >
                            <select
                                className="gs-control"
                                value={
                                    generalSetup.defaultGodown
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "defaultGodown",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select Godown
                                </option>

                                <option value="G1">
                                    Main Godown
                                </option>

                                {/*
                  Godown Master options will be loaded
                  from the backend later.
                */}
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Default Selection"
                            description="Default selection mode used when opening Billing."
                        >
                            <select
                                className="gs-control"
                                value={
                                    generalSetup.defaultSelection
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "defaultSelection",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="ROUTE">
                                    Route
                                </option>

                                <option value="AREA">
                                    Area
                                </option>

                                <option value="PARTY">
                                    Party
                                </option>

                                <option value="SALESMAN">
                                    Salesman
                                </option>
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Save and Print"
                            description="Automatically open the print format after saving a bill."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.saveAndPrint
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "saveAndPrint",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow SRate Less Than PRate"
                            description="Allow sale rate to be lower than purchase rate."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowSRateLessThanPRate
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowSRateLessThanPRate",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Update Load Qty After Bill Edit"
                            description="Recalculate load quantity when a loaded bill is edited."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.updateLoadQtyAfterBillEdit
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "updateLoadQtyAfterBillEdit",
                                        value
                                    )
                                }
                            />
                        </SettingRow>

                        <SettingRow
                            label="Allow Negative Stock"
                            description="Allow billing even when available stock becomes negative."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.allowNegativeStock
                                }
                                onChange={(value) =>
                                    updateSetting(
                                        "allowNegativeStock",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>
                </div>

                {/* ===================================================
            COLUMN 3 — BILL PRINT AND GENERAL
            =================================================== */}

                <div className="gs-column">
                    <SettingSection title="BILL PRINT">
                        <SettingRow
                            label="Goods Return"
                            description="Show Goods Return information in the bill print."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.goodsReturn
                                }
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
                                onChange={(value) =>
                                    updateSetting(
                                        "serialNo",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>

                    <SettingSection title="GENERAL">
                        <SettingRow
                            label="Auto Voucher No"
                            description="Automatically generate voucher numbers."
                        >
                            <ToggleSwitch
                                checked={
                                    generalSetup.autoVoucherNo
                                }
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
                                onChange={(value) =>
                                    updateSetting(
                                        "billingWithoutHsnCode",
                                        value
                                    )
                                }
                            />
                        </SettingRow>
                    </SettingSection>

                    <section className="gs-system-card">
                        <div className="gs-system-card-title">
                            SYSTEM INFORMATION
                        </div>

                        <div className="gs-system-row">
                            <span>Logged In User</span>
                            <strong>
                                {localStorage.getItem("userName") ||
                                    localStorage.getItem("username") ||
                                    "Administrator"}
                            </strong>
                        </div>

                        <div className="gs-system-row">
                            <span>Firm</span>
                            <strong>
                                {localStorage.getItem("firmName") ||
                                    "Current Firm"}
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
            </div>

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