import React from "react";
import "./SecuritySetup.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

// const API_URL = "http://localhost:5000/api";
const API_URL = "https://total-solution-backend.onrender.com/api";

/* =========================================================
   PERMISSION COLUMNS
========================================================= */

const PERMISSION_COLUMNS = [
    {
        key: "view",
        label: "View",
    },
    {
        key: "add",
        label: "Add",
    },
    {
        key: "edit",
        label: "Edit",
    },
    {
        key: "delete",
        label: "Delete",
    },
    {
        key: "print",
        label: "Print",
    },
    {
        key: "export",
        label: "Export",
    },
];

/* =========================================================
   DEFAULT OPERATIONS / MODULES
========================================================= */

const DEFAULT_OPERATION_GROUPS = [
    {
        id: "master",
        name: "Master",
        icon: "📁",
        operations: [
            {
                id: "master-company",
                name: "Company",
                module: "MASTER",
                operation: "COMPANY",
            },
            {
                id: "master-party",
                name: "Party",
                module: "MASTER",
                operation: "PARTY",
            },
            {
                id: "master-product",
                name: "Product",
                module: "MASTER",
                operation: "PRODUCT",
            },
            {
                id: "master-account",
                name: "Account",
                module: "MASTER",
                operation: "ACCOUNT",
            },
            {
                id: "master-other-account",
                name: "Other Account",
                module: "MASTER",
                operation: "OTHER_ACCOUNT",
            },
            {
                id: "master-group",
                name: "Group",
                module: "MASTER",
                operation: "GROUP",
            },
            {
                id: "master-category",
                name: "Category",
                module: "MASTER",
                operation: "CATEGORY",
            },
            {
                id: "master-gst",
                name: "GST",
                module: "MASTER",
                operation: "GST",
            },
            {
                id: "master-salesman",
                name: "Salesman",
                module: "MASTER",
                operation: "SALESMAN",
            },
            {
                id: "master-area",
                name: "Area",
                module: "MASTER",
                operation: "AREA",
            },
            {
                id: "master-godown",
                name: "Godown",
                module: "MASTER",
                operation: "GODOWN",
            },
        ],
    },
    {
        id: "mapping",
        name: "Mapping",
        icon: "📁",
        operations: [
            {
                id: "mapping-area-party",
                name: "Area Party Mapping",
                module: "MAPPING",
                operation: "AREA_PARTY_MAPPING",
            },
            {
                id: "mapping-company-product",
                name: "Company Product Mapping",
                module: "MAPPING",
                operation: "COMPANY_PRODUCT_MAPPING",
            },
            {
                id: "mapping-user-firm",
                name: "User Firm Mapping",
                module: "MAPPING",
                operation: "USER_FIRM_MAPPING",
            },
        ],
    },
    {
        id: "sales",
        name: "Sales",
        icon: "📊",
        operations: [
            {
                id: "sales-billing",
                name: "Sales Billing",
                module: "SALES",
                operation: "SALES_BILLING",
            },
            {
                id: "sales-list",
                name: "Sales List",
                module: "SALES",
                operation: "SALES_LIST",
            },
            {
                id: "sales-quotation",
                name: "Quotation",
                module: "SALES",
                operation: "QUOTATION",
            },
            {
                id: "sales-order",
                name: "Sales Order",
                module: "SALES",
                operation: "SALES_ORDER",
            },
            {
                id: "sales-load",
                name: "Create Load",
                module: "SALES",
                operation: "CREATE_LOAD",
            },
            {
                id: "sales-settle-load",
                name: "Settle Load",
                module: "SALES",
                operation: "SETTLE_LOAD",
            },
            {
                id: "sales-load-transfer",
                name: "Load Transfer",
                module: "SALES",
                operation: "LOAD_TRANSFER",
            },
        ],
    },
    {
        id: "vouchers",
        name: "Vouchers",
        icon: "📁",
        operations: [
            {
                id: "voucher-purchase",
                name: "Purchase",
                module: "VOUCHERS",
                operation: "PURCHASE",
            },
            {
                id: "voucher-credit-note",
                name: "Credit Note",
                module: "VOUCHERS",
                operation: "CREDIT_NOTE",
            },
            {
                id: "voucher-debit-note",
                name: "Debit Note",
                module: "VOUCHERS",
                operation: "DEBIT_NOTE",
            },
            {
                id: "voucher-receipt",
                name: "Receipt",
                module: "VOUCHERS",
                operation: "RECEIPT",
            },
            {
                id: "voucher-payment",
                name: "Payment",
                module: "VOUCHERS",
                operation: "PAYMENT",
            },
        ],
    },
    {
        id: "transactions",
        name: "Transactions",
        icon: "📁",
        operations: [
            {
                id: "transaction-journal",
                name: "Journal Voucher",
                module: "TRANSACTIONS",
                operation: "JOURNAL_VOUCHER",
            },
            {
                id: "transaction-contra",
                name: "Contra",
                module: "TRANSACTIONS",
                operation: "CONTRA",
            },
            {
                id: "transaction-collection",
                name: "Collection Voucher",
                module: "TRANSACTIONS",
                operation: "COLLECTION_VOUCHER",
            },
            {
                id: "transaction-pdc",
                name: "PDC Docket",
                module: "TRANSACTIONS",
                operation: "PDC_DOCKET",
            },
            {
                id: "transaction-cheque-bounce",
                name: "Cheque Bounce",
                module: "TRANSACTIONS",
                operation: "CHEQUE_BOUNCE",
            },
        ],
    },
    {
        id: "reports",
        name: "Reports",
        icon: "📈",
        operations: [
            {
                id: "report-party-sales",
                name: "Party Wise Sales",
                module: "REPORTS",
                operation: "PARTY_WISE_SALES",
            },
            {
                id: "report-product-sales",
                name: "Product Wise Sales",
                module: "REPORTS",
                operation: "PRODUCT_WISE_SALES",
            },
            {
                id: "report-stock",
                name: "Stock Report",
                module: "REPORTS",
                operation: "STOCK_REPORT",
            },
            {
                id: "report-outstanding",
                name: "Outstanding Report",
                module: "REPORTS",
                operation: "OUTSTANDING_REPORT",
            },
            {
                id: "report-gst",
                name: "GST Reports",
                module: "REPORTS",
                operation: "GST_REPORTS",
            },
        ],
    },
    {
        id: "tools",
        name: "Tools",
        icon: "🛠",
        operations: [
            {
                id: "tools-general-setup-1",
                name: "General Setup 1",
                module: "TOOLS",
                operation: "GENERAL_SETUP_1",
            },
            {
                id: "tools-general-setup-2",
                name: "General Setup 2",
                module: "TOOLS",
                operation: "GENERAL_SETUP_2",
            },
            {
                id: "tools-security-setup",
                name: "Security Setup",
                module: "TOOLS",
                operation: "SECURITY_SETUP",
            },
            {
                id: "tools-data-export",
                name: "Data Export",
                module: "TOOLS",
                operation: "DATA_EXPORT",
            },
        ],
    },
    {
        id: "system",
        name: "System",
        icon: "⚙️",
        operations: [
            {
                id: "system-users",
                name: "Users",
                module: "SYSTEM",
                operation: "USERS",
            },
            {
                id: "system-firms",
                name: "Firms",
                module: "SYSTEM",
                operation: "FIRMS",
            },
            {
                id: "system-database",
                name: "Database",
                module: "SYSTEM",
                operation: "DATABASE",
            },
        ],
    },
];

/* =========================================================
   SAMPLE USERS USED ONLY WHEN API RETURNS NO USERS

   Remove this fallback if your API always returns users.
========================================================= */

const DEFAULT_USERS = [
    {
        id: "administrator",
        userId: "administrator",
        userName: "Muk123",
        roleName: "Administrator",
        isAdministrator: true,
    },
    {
        id: "manager",
        userId: "manager",
        userName: "Manager",
        roleName: "Manager",
        isAdministrator: false,
    },
    {
        id: "user1",
        userId: "user1",
        userName: "User1",
        roleName: "Data Entry",
        isAdministrator: false,
    },
    {
        id: "user2",
        userId: "user2",
        userName: "User2",
        roleName: "Sales",
        isAdministrator: false,
    },
    {
        id: "user3",
        userId: "user3",
        userName: "User3",
        roleName: "Viewer",
        isAdministrator: false,
    },
];

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const createBlankPermission = () => ({
    view: false,
    add: false,
    edit: false,
    delete: false,
    print: false,
    export: false,
});

const createFullPermission = () => ({
    view: true,
    add: true,
    edit: true,
    delete: true,
    print: true,
    export: true,
});

const parseBoolean = (value) => {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        String(value || "").trim().toUpperCase() === "Y" ||
        String(value || "").trim().toUpperCase() === "YES" ||
        String(value || "").trim().toUpperCase() === "TRUE"
    );
};

const normalizeUser = (user, index) => {
    const userId = String(
        user?.userId ||
            user?._id ||
            user?.id ||
            user?.SysUserCode ||
            user?.UserCode ||
            user?.username ||
            `user-${index + 1}`
    );

    const userName = String(
        user?.userName ||
            user?.username ||
            user?.name ||
            user?.UserName ||
            user?.LoginName ||
            `User ${index + 1}`
    );

    const roleName = String(
        user?.roleName ||
            user?.role ||
            user?.RoleName ||
            user?.UserType ||
            "User"
    );

    const isAdministrator =
        parseBoolean(
            user?.isAdministrator ||
                user?.isAdmin ||
                user?.administrator
        ) ||
        roleName.toUpperCase() === "ADMINISTRATOR" ||
        roleName.toUpperCase() === "ADMIN";

    return {
        ...user,
        id: userId,
        userId,
        userName,
        roleName,
        isAdministrator,
    };
};

const normalizeOperationGroups = (groups) => {
    if (!Array.isArray(groups) || groups.length === 0) {
        return DEFAULT_OPERATION_GROUPS;
    }

    return groups.map((group, groupIndex) => ({
        id: String(
            group?.id ||
                group?.groupId ||
                group?.module ||
                `group-${groupIndex + 1}`
        ),
        name: String(
            group?.name ||
                group?.groupName ||
                group?.moduleName ||
                group?.module ||
                `Module ${groupIndex + 1}`
        ),
        icon: group?.icon || "📁",
        operations: Array.isArray(group?.operations)
            ? group.operations.map((operation, operationIndex) => ({
                  id: String(
                      operation?.id ||
                          operation?.operationId ||
                          operation?.code ||
                          `${groupIndex}-${operationIndex}`
                  ),
                  name: String(
                      operation?.name ||
                          operation?.operationName ||
                          operation?.label ||
                          operation?.code ||
                          `Operation ${operationIndex + 1}`
                  ),
                  module: String(
                      operation?.module ||
                          operation?.moduleCode ||
                          group?.module ||
                          group?.name ||
                          ""
                  )
                      .trim()
                      .toUpperCase(),
                  operation: String(
                      operation?.operation ||
                          operation?.operationCode ||
                          operation?.code ||
                          operation?.id ||
                          ""
                  )
                      .trim()
                      .toUpperCase(),
              }))
            : [],
    }));
};

const normalizePermission = (permission) => ({
    view: parseBoolean(
        permission?.view ??
            permission?.canView ??
            permission?.View
    ),
    add: parseBoolean(
        permission?.add ??
            permission?.canAdd ??
            permission?.Add
    ),
    edit: parseBoolean(
        permission?.edit ??
            permission?.canEdit ??
            permission?.Edit
    ),
    delete: parseBoolean(
        permission?.delete ??
            permission?.canDelete ??
            permission?.Delete
    ),
    print: parseBoolean(
        permission?.print ??
            permission?.canPrint ??
            permission?.Print
    ),
    export: parseBoolean(
        permission?.export ??
            permission?.canExport ??
            permission?.Export
    ),
});

/* =========================================================
   CHECKBOX COMPONENT
========================================================= */

const PermissionCheckbox = ({
    checked,
    indeterminate = false,
    disabled = false,
    onChange,
    title = "",
}) => {
    const checkboxRef = React.useRef(null);

    React.useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate =
                Boolean(indeterminate);
        }
    }, [indeterminate]);

    return (
        <label
            className={`security-checkbox ${
                disabled ? "is-disabled" : ""
            }`}
            title={title}
        >
            <input
                ref={checkboxRef}
                type="checkbox"
                checked={Boolean(checked)}
                disabled={disabled}
                onChange={(event) =>
                    onChange?.(event.target.checked)
                }
            />

            <span className="security-checkbox-box">
                <span className="security-checkbox-tick">
                    ✓
                </span>

                <span className="security-checkbox-minus">
                    −
                </span>
            </span>
        </label>
    );
};

/* =========================================================
   SEARCH ICON
========================================================= */

const SearchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="security-search-svg"
    >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20L16.65 16.65" />
    </svg>
);

/* =========================================================
   SECURITY SETUP PAGE
========================================================= */

const SecuritySetup = ({
    isAdmin = false,
    onPermissionsSaved,
}) => {
    const [operationGroups, setOperationGroups] =
        React.useState(DEFAULT_OPERATION_GROUPS);

    const [users, setUsers] =
        React.useState([]);

    const [permissions, setPermissions] =
        React.useState({});

    const [initialPermissions, setInitialPermissions] =
        React.useState({});

    const [selectedOperationId, setSelectedOperationId] =
        React.useState("");

    const [expandedGroups, setExpandedGroups] =
        React.useState({
            master: true,
        });

    const [operationSearch, setOperationSearch] =
        React.useState("");

    const [userSearch, setUserSearch] =
        React.useState("");

    const [loading, setLoading] =
        React.useState(true);

    const [saving, setSaving] =
        React.useState(false);

    const [message, setMessage] =
        React.useState("");

    const onPermissionsSavedRef =
        React.useRef(onPermissionsSaved);

    React.useEffect(() => {
        onPermissionsSavedRef.current =
            onPermissionsSaved;
    }, [onPermissionsSaved]);

    /* =====================================================
       SESSION INFORMATION
    ===================================================== */

    const getSecuritySession = React.useCallback(() => {
        const distributorId = String(
            localStorage.getItem("distributorId") || ""
        ).trim();

        const firmId = String(
            localStorage.getItem("firmId") || ""
        ).trim();

        const currentUserId = String(
            localStorage.getItem("userId") ||
                localStorage.getItem("sysUserCode") ||
                ""
        ).trim();

        return {
            distributorId,
            firmId,
            currentUserId,
        };
    }, []);

    /* =====================================================
       FETCH WITH TIMEOUT
    ===================================================== */

    const fetchWithTimeout = React.useCallback(
        async (
            url,
            options = {},
            timeoutMs = 15000
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
        },
        []
    );

    /* =====================================================
       READ RESPONSE
    ===================================================== */

    const readResponse = async (response) => {
        const contentType =
            response.headers.get("content-type") || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            return response.json();
        }

        return {
            success: response.ok,
            message: await response.text(),
        };
    };

    /* =====================================================
       PERMISSION KEY
    ===================================================== */

    const getPermissionKey = (
        operationId,
        userId
    ) => {
        return `${operationId}::${userId}`;
    };

    /* =====================================================
       FIND SELECTED OPERATION
    ===================================================== */

    const selectedOperation =
        React.useMemo(() => {
            for (const group of operationGroups) {
                const operation =
                    group.operations.find(
                        (item) =>
                            item.id ===
                            selectedOperationId
                    );

                if (operation) {
                    return {
                        ...operation,
                        groupId: group.id,
                        groupName: group.name,
                    };
                }
            }

            return null;
        }, [
            operationGroups,
            selectedOperationId,
        ]);

    /* =====================================================
       NORMALIZE API PERMISSIONS
    ===================================================== */

   const normalizePermissions = React.useCallback(
    (normalizedGroups, normalizedUsers) => {
        const permissionMap = {};

        normalizedUsers.forEach((user) => {

            const userPermissions =
                user.permissions || {};

            normalizedGroups.forEach((group) => {

                const groupPermissions =
                    userPermissions[group.id] || {};

                group.operations.forEach((operation) => {

                    const key = getPermissionKey(
                        operation.id,
                        user.userId
                    );

                    if (user.isAdministrator) {
                        permissionMap[key] =
                            createFullPermission();
                        return;
                    }

                    permissionMap[key] =
                        normalizePermission(
                            groupPermissions[
                                operation.operation
                            ] || {}
                        );
                });
            });
        });

        return permissionMap;
    },
    []
);
    /* =====================================================
       LOAD SECURITY SETUP
    ===================================================== */

    const loadSecuritySetup =
        React.useCallback(async () => {
            const {
                distributorId,
                firmId,
            } = getSecuritySession();

            if (!distributorId || !firmId) {
                setLoading(false);

                setMessage(
                    "Distributor or Firm information was not found. Please login again."
                );

                return null;
            }

            try {
                setLoading(true);
                setMessage("");

                const query =
                    new URLSearchParams({
                        distributorId,
                        firmId,
                    });

                const response =
                    await fetchWithTimeout(
                        `${API_URL}/security-setup?${query.toString()}`
                    );

                const result =
                    await readResponse(
                        response
                    );

                if (
                    !response.ok ||
                    result?.success === false
                ) {
                    throw new Error(
                        result?.message ||
                            "Unable to load Security Setup."
                    );
                }

                const returnedGroups =
                    result?.operationGroups ||
                    result?.modules ||
                    result?.operations ||
                    result?.data
                        ?.operationGroups;

                const normalizedGroups =
                    normalizeOperationGroups(
                        returnedGroups
                    );

                const returnedUsers =
                    result?.users ||
                    result?.data?.users ||
                    [];

                const normalizedUsers =
                    (
                        Array.isArray(
                            returnedUsers
                        ) &&
                        returnedUsers.length > 0
                            ? returnedUsers
                            : DEFAULT_USERS
                    ).map(normalizeUser);

                const normalizedPermissionMap =
    normalizePermissions(
        normalizedGroups,
        normalizedUsers
    );

                setOperationGroups(
                    normalizedGroups
                );

                setUsers(normalizedUsers);

                setPermissions(
                    normalizedPermissionMap
                );

                setInitialPermissions(
                    JSON.parse(
                        JSON.stringify(
                            normalizedPermissionMap
                        )
                    )
                );

                const firstOperation =
                    normalizedGroups.find(
                        (group) =>
                            group.operations
                                .length > 0
                    )?.operations?.[0];

                if (firstOperation) {
                    setSelectedOperationId(
                        (current) =>
                            current ||
                            firstOperation.id
                    );

                    const parentGroup =
                        normalizedGroups.find(
                            (group) =>
                                group.operations.some(
                                    (operation) =>
                                        operation.id ===
                                        firstOperation.id
                                )
                        );

                    if (parentGroup) {
                        setExpandedGroups(
                            (previous) => ({
                                ...previous,
                                [parentGroup.id]:
                                    true,
                            })
                        );
                    }
                }

                return {
                    operationGroups:
                        normalizedGroups,
                    users: normalizedUsers,
                    permissions:
                        normalizedPermissionMap,
                };
            } catch (error) {
                console.error(
                    "Security Setup load error:",
                    error
                );

                const errorMessage =
                    error?.name ===
                    "AbortError"
                        ? "The Security Setup server did not respond within 15 seconds."
                        : error?.message ||
                          "Unable to load Security Setup.";

                setMessage(errorMessage);

                /*
                 * Keep the page usable even when the
                 * backend endpoint is not yet available.
                 */
                const normalizedUsers =
                    DEFAULT_USERS.map(
                        normalizeUser
                    );

           const fallbackPermissions =
    normalizePermissions(
        DEFAULT_OPERATION_GROUPS,
        normalizedUsers
    );

                setOperationGroups(
                    DEFAULT_OPERATION_GROUPS
                );

                setUsers(normalizedUsers);

                setPermissions(
                    fallbackPermissions
                );

                setInitialPermissions(
                    JSON.parse(
                        JSON.stringify(
                            fallbackPermissions
                        )
                    )
                );

                setSelectedOperationId(
                    "master-company"
                );

                return null;
            } finally {
                setLoading(false);
            }
        }, [
            fetchWithTimeout,
            getSecuritySession,
            normalizePermissions,
        ]);

    React.useEffect(() => {
        loadSecuritySetup();
    }, [loadSecuritySetup]);

    /* =====================================================
       FILTER OPERATIONS
    ===================================================== */

    const filteredOperationGroups =
        React.useMemo(() => {
            const searchValue =
                operationSearch
                    .trim()
                    .toLowerCase();

            if (!searchValue) {
                return operationGroups;
            }

            return operationGroups
                .map((group) => {
                    const groupMatches =
                        group.name
                            .toLowerCase()
                            .includes(
                                searchValue
                            );

                    const operations =
                        groupMatches
                            ? group.operations
                            : group.operations.filter(
                                  (operation) =>
                                      operation.name
                                          .toLowerCase()
                                          .includes(
                                              searchValue
                                          )
                              );

                    return {
                        ...group,
                        operations,
                    };
                })
                .filter(
                    (group) =>
                        group.operations.length > 0
                );
        }, [
            operationGroups,
            operationSearch,
        ]);

    /* =====================================================
       FILTER USERS
    ===================================================== */

    const filteredUsers =
        React.useMemo(() => {
            const searchValue =
                userSearch
                    .trim()
                    .toLowerCase();

            if (!searchValue) {
                return users;
            }

            return users.filter((user) => {
                return (
                    user.userName
                        .toLowerCase()
                        .includes(searchValue) ||
                    user.roleName
                        .toLowerCase()
                        .includes(searchValue)
                );
            });
        }, [users, userSearch]);

    /* =====================================================
       UNSAVED CHANGES
    ===================================================== */

    const hasChanges =
        React.useMemo(() => {
            return (
                JSON.stringify(permissions) !==
                JSON.stringify(
                    initialPermissions
                )
            );
        }, [
            permissions,
            initialPermissions,
        ]);

    /* =====================================================
       TOGGLE GROUP
    ===================================================== */

    const toggleGroup = (groupId) => {
        setExpandedGroups((previous) => ({
            ...previous,
            [groupId]:
                !previous[groupId],
        }));
    };

    /* =====================================================
       SELECT OPERATION
    ===================================================== */

    const handleSelectOperation = (
        groupId,
        operationId
    ) => {
        setSelectedOperationId(
            operationId
        );

        setExpandedGroups((previous) => ({
            ...previous,
            [groupId]: true,
        }));

        setMessage("");
    };

    /* =====================================================
       UPDATE SINGLE PERMISSION
    ===================================================== */

    const updatePermission = (
        user,
        permissionName,
        checked
    ) => {
        if (
            !selectedOperation ||
            user.isAdministrator
        ) {
            return;
        }

        const permissionKey =
            getPermissionKey(
                selectedOperation.id,
                user.userId
            );

        setPermissions((previous) => {
            const currentPermission =
                previous[permissionKey] ||
                createBlankPermission();

            const updatedPermission = {
                ...currentPermission,
                [permissionName]:
                    Boolean(checked),
            };

            /*
             * Add/Edit/Delete normally require View.
             */
            if (
                checked &&
                [
                    "add",
                    "edit",
                    "delete",
                    "print",
                    "export",
                ].includes(permissionName)
            ) {
                updatedPermission.view =
                    true;
            }

            /*
             * Turning View off removes all other authorities.
             */
            if (
                permissionName === "view" &&
                !checked
            ) {
                return {
                    ...previous,
                    [permissionKey]:
                        createBlankPermission(),
                };
            }

            return {
                ...previous,
                [permissionKey]:
                    updatedPermission,
            };
        });

        setMessage("");
    };

    /* =====================================================
       COLUMN SELECTION STATE
    ===================================================== */

    const getColumnSelectionState = (
        permissionName
    ) => {
        if (
            !selectedOperation ||
            filteredUsers.length === 0
        ) {
            return {
                checked: false,
                indeterminate: false,
            };
        }

        const editableUsers =
            filteredUsers.filter(
                (user) =>
                    !user.isAdministrator
            );

        if (editableUsers.length === 0) {
            return {
                checked: true,
                indeterminate: false,
            };
        }

        const selectedCount =
            editableUsers.filter((user) => {
                const permissionKey =
                    getPermissionKey(
                        selectedOperation.id,
                        user.userId
                    );

                return Boolean(
                    permissions[
                        permissionKey
                    ]?.[permissionName]
                );
            }).length;

        return {
            checked:
                selectedCount ===
                editableUsers.length,
            indeterminate:
                selectedCount > 0 &&
                selectedCount <
                    editableUsers.length,
        };
    };

    /* =====================================================
       UPDATE COMPLETE COLUMN
    ===================================================== */

    const updatePermissionColumn = (
        permissionName,
        checked
    ) => {
        if (!selectedOperation) {
            return;
        }

        setPermissions((previous) => {
            const updated = {
                ...previous,
            };

            filteredUsers.forEach((user) => {
                if (
                    user.isAdministrator
                ) {
                    return;
                }

                const permissionKey =
                    getPermissionKey(
                        selectedOperation.id,
                        user.userId
                    );

                const currentPermission =
                    updated[
                        permissionKey
                    ] ||
                    createBlankPermission();

                if (
                    permissionName ===
                        "view" &&
                    !checked
                ) {
                    updated[
                        permissionKey
                    ] =
                        createBlankPermission();

                    return;
                }

                updated[
                    permissionKey
                ] = {
                    ...currentPermission,
                    [permissionName]:
                        Boolean(checked),
                };

                if (
                    checked &&
                    permissionName !==
                        "view"
                ) {
                    updated[
                        permissionKey
                    ].view = true;
                }
            });

            return updated;
        });

        setMessage("");
    };

    /* =====================================================
       USER ROW SELECT ALL
    ===================================================== */

    const getUserPermissionState = (
        user
    ) => {
        if (!selectedOperation) {
            return {
                checked: false,
                indeterminate: false,
            };
        }

        if (user.isAdministrator) {
            return {
                checked: true,
                indeterminate: false,
            };
        }

        const permissionKey =
            getPermissionKey(
                selectedOperation.id,
                user.userId
            );

        const currentPermission =
            permissions[permissionKey] ||
            createBlankPermission();

        const selectedCount =
            PERMISSION_COLUMNS.filter(
                (column) =>
                    currentPermission[
                        column.key
                    ]
            ).length;

        return {
            checked:
                selectedCount ===
                PERMISSION_COLUMNS.length,
            indeterminate:
                selectedCount > 0 &&
                selectedCount <
                    PERMISSION_COLUMNS.length,
        };
    };

    const updateUserAllPermissions = (
        user,
        checked
    ) => {
        if (
            !selectedOperation ||
            user.isAdministrator
        ) {
            return;
        }

        const permissionKey =
            getPermissionKey(
                selectedOperation.id,
                user.userId
            );

        setPermissions((previous) => ({
            ...previous,
            [permissionKey]: checked
                ? createFullPermission()
                : createBlankPermission(),
        }));

        setMessage("");
    };

    /* =====================================================
       RESET SELECTED OPERATION
    ===================================================== */

    const resetSelectedOperation = () => {
        if (!selectedOperation) {
            return;
        }

        setPermissions((previous) => {
            const updated = {
                ...previous,
            };

            users.forEach((user) => {
                const permissionKey =
                    getPermissionKey(
                        selectedOperation.id,
                        user.userId
                    );

                updated[permissionKey] =
                    initialPermissions[
                        permissionKey
                    ] ||
                    (user.isAdministrator
                        ? createFullPermission()
                        : createBlankPermission());
            });

            return updated;
        });

        setMessage(
            `${selectedOperation.name} permissions were restored to their last saved values.`
        );
    };

    /* =====================================================
       RESET TO DEFAULT
    ===================================================== */

    const handleResetToDefault = () => {
        const defaultPermissionMap = {};

        operationGroups.forEach((group) => {
            group.operations.forEach(
                (operation) => {
                    users.forEach((user) => {
                        defaultPermissionMap[
                            getPermissionKey(
                                operation.id,
                                user.userId
                            )
                        ] =
                            user.isAdministrator
                                ? createFullPermission()
                                : createBlankPermission();
                    });
                }
            );
        });

        setPermissions(
            defaultPermissionMap
        );

        setMessage(
            "Default authorities restored. Click Save Changes to apply them."
        );
    };

    /* =====================================================
       BUILD SAVE PAYLOAD
    ===================================================== */

 const buildPermissionPayload = () => {
    return users.map((user) => {

        const userPermissions = {};

        operationGroups.forEach((group) => {

            userPermissions[group.id] = {};

            group.operations.forEach((operation) => {

                const permissionKey =
                    getPermissionKey(
                        operation.id,
                        user.userId
                    );

                userPermissions[group.id][
                    operation.operation
                ] =
                    permissions[
                        permissionKey
                    ] ||
                    createBlankPermission();

            });

        });

        return {
            userId: user.userId,
            userName: user.userName,
            role: user.roleName,
            permissions: userPermissions,
        };

    });
};

    /* =====================================================
       SAVE SECURITY SETUP
    ===================================================== */

    const handleSave = async () => {
        const {
            distributorId,
            firmId,
            currentUserId,
        } = getSecuritySession();

        if (!distributorId || !firmId) {
            setMessage(
                "Distributor or Firm information was not found. Please login again."
            );

            return;
        }

        try {
            setSaving(true);
            setMessage("");

           const usersPayload =
    buildPermissionPayload();

            const response =
                await fetchWithTimeout(
                    `${API_URL}/security-setup`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                   body: JSON.stringify({
    distributorId,
    firmId,
    updatedBy: currentUserId,
    users: usersPayload,
}),
                    },
                    15000
                );

            const result =
                await readResponse(
                    response
                );

            if (
                !response.ok ||
                result?.success === false
            ) {
                throw new Error(
                    result?.message ||
                        "Unable to save Security Setup."
                );
            }

            setInitialPermissions(
                JSON.parse(
                    JSON.stringify(
                        permissions
                    )
                )
            );

            setMessage(
                "Security Setup saved successfully."
            );

            if (
                typeof onPermissionsSavedRef.current ===
                "function"
            ) {
             onPermissionsSavedRef.current({
    permissions,
    users: usersPayload,
});
            }
        } catch (error) {
            console.error(
                "Security Setup save error:",
                error
            );

            const errorMessage =
                error?.name ===
                "AbortError"
                    ? "The Security Setup server did not respond within 15 seconds."
                    : error?.message ||
                      "Unable to save Security Setup.";

            setMessage(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       ACCESS RESTRICTED
    ===================================================== */

    if (!isAdmin) {
        return (
            <div className="security-setup-page">
                <div className="security-access-denied">
                    <div className="security-access-denied-icon">
                        🔒
                    </div>

                    <h2>Access Restricted</h2>

                    <p>
                        You are not authorized to
                        access Security Setup.
                    </p>

                    <div className="security-access-denied-note">
                        Only an Administrator can
                        manage user authorities and
                        access permissions.
                    </div>
                </div>
            </div>
        );
    }

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {
        return (
            <div className="security-setup-page">
                <div className="security-loading">
                    <div className="security-loading-spinner" />

                    <strong>
                        Loading Security Setup...
                    </strong>

                    <span>
                        Please wait while user
                        permissions are loaded.
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="security-setup-page">
            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="security-page-header">
                <div className="security-page-heading">
                    <h1>Security Setup</h1>

                    <p>
                        Set user authorities and access
                        permissions.
                    </p>
                </div>

                <div className="security-page-actions">
                    <button
                        type="button"
                        className="security-button security-button-secondary"
                        onClick={
                            handleResetToDefault
                        }
                        disabled={saving}
                    >
                        <span className="security-button-icon">
                            ◌
                        </span>

                        Reset to Default
                    </button>

                    <button
                        type="button"
                        className="security-button security-button-primary"
                        onClick={handleSave}
                        disabled={
                            saving ||
                            !hasChanges
                        }
                    >
                        <span className="security-button-icon">
                            ▣
                        </span>

                        {saving
                            ? "Saving..."
                            : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* =================================================
                MAIN SECURITY WORKSPACE
            ================================================= */}

            <div className="security-workspace">
                {/* =============================================
                    LEFT OPERATIONS PANEL
                ============================================= */}

                <aside className="security-operations-panel">
                    <div className="security-panel-heading">
                        <div>
                            <h2>
                                Operations / Modules
                            </h2>

                            <span>
                                Select an operation
                            </span>
                        </div>

                        <span className="security-operation-count">
                            {operationGroups.reduce(
                                (total, group) =>
                                    total +
                                    group.operations
                                        .length,
                                0
                            )}
                        </span>
                    </div>

                    <div className="security-search-box">
                        <SearchIcon />

                        <input
                            type="text"
                            value={
                                operationSearch
                            }
                            placeholder="Search operations..."
                            onChange={(event) =>
                                setOperationSearch(
                                    event.target
                                        .value
                                )
                            }
                        />

                        {operationSearch && (
                            <button
                                type="button"
                                className="security-search-clear"
                                onClick={() =>
                                    setOperationSearch(
                                        ""
                                    )
                                }
                                aria-label="Clear operation search"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="security-operation-tree">
                        {filteredOperationGroups.length ===
                        0 ? (
                            <div className="security-empty-tree">
                                No matching operation
                                found.
                            </div>
                        ) : (
                            filteredOperationGroups.map(
                                (group) => {
                                    const isExpanded =
                                        operationSearch
                                            ? true
                                            : Boolean(
                                                  expandedGroups[
                                                      group
                                                          .id
                                                  ]
                                              );

                                    return (
                                        <div
                                            key={
                                                group.id
                                            }
                                            className="security-operation-group"
                                        >
                                            <button
                                                type="button"
                                                className="security-group-button"
                                                onClick={() =>
                                                    toggleGroup(
                                                        group.id
                                                    )
                                                }
                                            >
                                                <span
                                                    className={`security-group-arrow ${
                                                        isExpanded
                                                            ? "is-expanded"
                                                            : ""
                                                    }`}
                                                >
                                                    ›
                                                </span>

                                                <span className="security-group-icon">
                                                    {
                                                        group.icon
                                                    }
                                                </span>

                                                <span className="security-group-name">
                                                    {
                                                        group.name
                                                    }
                                                </span>

                                                <span className="security-group-count">
                                                    {
                                                        group
                                                            .operations
                                                            .length
                                                    }
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div className="security-group-operations">
                                                    {group.operations.map(
                                                        (
                                                            operation
                                                        ) => (
                                                            <button
                                                                key={
                                                                    operation.id
                                                                }
                                                                type="button"
                                                                className={`security-operation-button ${
                                                                    selectedOperationId ===
                                                                    operation.id
                                                                        ? "is-active"
                                                                        : ""
                                                                }`}
                                                                onClick={() =>
                                                                    handleSelectOperation(
                                                                        group.id,
                                                                        operation.id
                                                                    )
                                                                }
                                                            >
                                                                <span className="security-operation-tree-line" />

                                                                <span className="security-operation-indicator">
                                                                    {selectedOperationId ===
                                                                    operation.id
                                                                        ? "✓"
                                                                        : ""}
                                                                </span>

                                                                <span className="security-operation-name">
                                                                    {
                                                                        operation.name
                                                                    }
                                                                </span>
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )
                        )}
                    </div>
                </aside>

                {/* =============================================
                    RIGHT USER PERMISSIONS PANEL
                ============================================= */}

                <main className="security-users-panel">
                    <div className="security-users-header">
                        <div className="security-users-heading">
                            <div>
                                <h2>Users</h2>

                                <p>
                                    {selectedOperation
                                        ? `Managing permissions for ${selectedOperation.groupName} / ${selectedOperation.name}`
                                        : "Select an operation to manage authorities"}
                                </p>
                            </div>

                            {selectedOperation && (
                                <div className="security-selected-operation-badge">
                                    <span>
                                        {
                                            selectedOperation.groupName
                                        }
                                    </span>

                                    <strong>
                                        {
                                            selectedOperation.name
                                        }
                                    </strong>
                                </div>
                            )}
                        </div>

                        <div className="security-users-tools">
                            <div className="security-search-box security-user-search">
                                <SearchIcon />

                                <input
                                    type="text"
                                    value={
                                        userSearch
                                    }
                                    placeholder="Search users..."
                                    onChange={(
                                        event
                                    ) =>
                                        setUserSearch(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                                {userSearch && (
                                    <button
                                        type="button"
                                        className="security-search-clear"
                                        onClick={() =>
                                            setUserSearch(
                                                ""
                                            )
                                        }
                                        aria-label="Clear user search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="security-reset-operation-button"
                                onClick={
                                    resetSelectedOperation
                                }
                                disabled={
                                    !selectedOperation ||
                                    saving
                                }
                            >
                                ↶ Reset Selected
                            </button>
                        </div>
                    </div>

                    {!selectedOperation ? (
                        <div className="security-no-operation">
                            <div className="security-no-operation-icon">
                                🔐
                            </div>

                            <h3>
                                Select an operation
                            </h3>

                            <p>
                                Choose an operation
                                from the left panel to
                                configure user
                                authorities.
                            </p>
                        </div>
                    ) : (
                        <div className="security-table-container">
                            <table className="security-permission-table">
                                <thead>
                                    <tr>
                                        <th className="security-user-column">
                                            <div className="security-user-header-cell">
                                                <span>
                                                    User Name
                                                </span>

                                                <small>
                                                    {
                                                        filteredUsers.length
                                                    }{" "}
                                                    Users
                                                </small>
                                            </div>
                                        </th>

                                        <th className="security-all-column">
                                            All
                                        </th>

                                        {PERMISSION_COLUMNS.map(
                                            (
                                                column
                                            ) => {
                                                const columnState =
                                                    getColumnSelectionState(
                                                        column.key
                                                    );

                                                return (
                                                    <th
                                                        key={
                                                            column.key
                                                        }
                                                    >
                                                        <div className="security-column-header">
                                                            <span>
                                                                {
                                                                    column.label
                                                                }
                                                            </span>

                                                            <PermissionCheckbox
                                                                checked={
                                                                    columnState.checked
                                                                }
                                                                indeterminate={
                                                                    columnState.indeterminate
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                                title={`Select ${column.label} permission for all visible users`}
                                                                onChange={(
                                                                    checked
                                                                ) =>
                                                                    updatePermissionColumn(
                                                                        column.key,
                                                                        checked
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </th>
                                                );
                                            }
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.length ===
                                    0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    PERMISSION_COLUMNS.length +
                                                    2
                                                }
                                                className="security-no-users"
                                            >
                                                No users
                                                matched
                                                your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(
                                            (
                                                user,
                                                index
                                            ) => {
                                                const permissionKey =
                                                    getPermissionKey(
                                                        selectedOperation.id,
                                                        user.userId
                                                    );

                                                const currentPermission =
                                                    permissions[
                                                        permissionKey
                                                    ] ||
                                                    createBlankPermission();

                                                const rowState =
                                                    getUserPermissionState(
                                                        user
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            user.userId
                                                        }
                                                        className={
                                                            user.isAdministrator
                                                                ? "is-administrator"
                                                                : ""
                                                        }
                                                    >
                                                        <td className="security-user-cell">
                                                            <div className="security-user-details">
                                                                <span className="security-user-avatar">
                                                                    {user.userName
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase()}
                                                                </span>

                                                                <div>
                                                                    <strong>
                                                                        {
                                                                            user.userName
                                                                        }
                                                                    </strong>

                                                                    <span>
                                                                        {
                                                                            user.roleName
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {user.isAdministrator && (
                                                                <span className="security-admin-badge">
                                                                    Full
                                                                    Access
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="security-permission-cell">
                                                            <PermissionCheckbox
                                                                checked={
                                                                    rowState.checked
                                                                }
                                                                indeterminate={
                                                                    rowState.indeterminate
                                                                }
                                                                disabled={
                                                                    user.isAdministrator ||
                                                                    saving
                                                                }
                                                                title={`Select all permissions for ${user.userName}`}
                                                                onChange={(
                                                                    checked
                                                                ) =>
                                                                    updateUserAllPermissions(
                                                                        user,
                                                                        checked
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        {PERMISSION_COLUMNS.map(
                                                            (
                                                                column
                                                            ) => (
                                                                <td
                                                                    key={
                                                                        column.key
                                                                    }
                                                                    className="security-permission-cell"
                                                                >
                                                                    <PermissionCheckbox
                                                                        checked={
                                                                            user.isAdministrator
                                                                                ? true
                                                                                : currentPermission[
                                                                                      column
                                                                                          .key
                                                                                  ]
                                                                        }
                                                                        disabled={
                                                                            user.isAdministrator ||
                                                                            saving
                                                                        }
                                                                        title={`${column.label} permission for ${user.userName}`}
                                                                        onChange={(
                                                                            checked
                                                                        ) =>
                                                                            updatePermission(
                                                                                user,
                                                                                column.key,
                                                                                checked
                                                                            )
                                                                        }
                                                                    />
                                                                </td>
                                                            )
                                                        )}
                                                    </tr>
                                                );
                                            }
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="security-table-footer">
                        <div className="security-legend">
                            <span>
                                <i className="security-legend-box is-enabled">
                                    ✓
                                </i>
                                Enabled
                            </span>

                            <span>
                                <i className="security-legend-box" />
                                Disabled
                            </span>

                            <span>
                                <i className="security-legend-admin">
                                    A
                                </i>
                                Administrator permissions
                                cannot be removed
                            </span>
                        </div>

                        <span className="security-visible-users">
                            Showing{" "}
                            <strong>
                                {filteredUsers.length}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {users.length}
                            </strong>{" "}
                            users
                        </span>
                    </div>
                </main>
            </div>

            {/* =================================================
                PAGE FOOTER
            ================================================= */}

            <div
                className={`security-page-footer ${
                    hasChanges
                        ? "has-changes"
                        : ""
                } ${
                    message
                        ? "has-message"
                        : ""
                }`}
            >
                <span className="security-footer-icon">
                    i
                </span>

                <span>
                    {message ||
                        (hasChanges
                            ? "You have unsaved permission changes. Click Save Changes to apply them."
                            : selectedOperation
                            ? `Select or clear authorities for ${selectedOperation.name}.`
                            : "Select an operation/module and set user authorities by enabling or disabling permissions.")}
                </span>
            </div>
        </div>
    );
};

export const hasPermission = (
    permissions,
    module,
    operation,
    action
) => {

    const role = String(
        localStorage.getItem("role") || ""
    ).toUpperCase();

    // Distributor Admin always has full access
    if (role === "DISTRIBUTOR_ADMIN") {
        return true;
    }

    if (!permissions) {
        return false;
    }

    const modulePermissions =
        permissions[
            String(module).toLowerCase()
        ];

    if (!modulePermissions) {
        return false;
    }

    const operationPermissions =
        modulePermissions[
            String(operation).toUpperCase()
        ];

    if (!operationPermissions) {
        return false;
    }

    return Boolean(
        operationPermissions[action]
    );
};
export default SecuritySetup;