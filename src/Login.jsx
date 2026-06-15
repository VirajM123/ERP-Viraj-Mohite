import React, { useEffect, useRef, useState } from "react";
import "./Login.css";

const API_URL = "http://localhost:5000/api";

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const countries = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Australia",
  "Canada",
  "China",
  "Germany",
  "France",
  "Italy",
  "Japan",
  "Nepal",
  "Sri Lanka",
  "Bangladesh",
  "Pakistan",
  "Singapore",
  "South Africa",
];

const emptyForm = {
  firmCode: "",
  firmName: "",
  firmId: "",
  address1: "",
  address2: "",
  city: "",
  pinCode: "",
  state: "",
  country: "India",
  phoneNo: "",
  mobileNo: "",
  tinNo: "",
  regNo: "",
  gstNo: "",
  drugLicNo: "",
  foodLicenceNo: "",
  distributorId: "",
  apiKey: "",
  email: "",
  userName: "",
  password: "",
  workingDate: getTodayDate(),
};

const Login = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [registeredFirms, setRegisteredFirms] = useState([]);
  const [firmsLoaded, setFirmsLoaded] = useState(false);
  const [loadingFirms, setLoadingFirms] = useState(false);

  const loadRequestId = useRef(0);

  const [formData, setFormData] = useState({
    ...emptyForm,
    userName: "",
    password: "",
  });

  const threeColumnRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
    alignItems: "end",
  };

  const clearFirmSelection = () => {
    setRegisteredFirms([]);
    setFirmsLoaded(false);
    setFormData((prev) => ({
      ...prev,
      firmName: "",
      firmId: "",
      firmCode: "",
      distributorId: "",
    }));
  };

  const loadUserFirms = async (showError = false) => {
    const requestId = ++loadRequestId.current;

    const userName = formData.userName.trim();
    const password = formData.password;

    if (!userName || !password) {
      clearFirmSelection();
      return [];
    }

    try {
      setLoadingFirms(true);

      const response = await fetch(`${API_URL}/login/firms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName,
          password,
        }),
      });

      const result = await response.json();

      if (requestId !== loadRequestId.current) {
        return [];
      }

      if (!response.ok) {
        setRegisteredFirms([]);
        setFirmsLoaded(false);
        setFormData((prev) => ({
          ...prev,
          firmName: "",
          firmId: "",
          firmCode: "",
          distributorId: "",
        }));

        if (showError) {
          alert(result.message || "Invalid username or password");
        }

        return [];
      }

      const firms = result.firms || [];

      setRegisteredFirms(firms);
      setFirmsLoaded(true);

      if (firms.length === 1) {
        const firm = firms[0];

        setFormData((prev) => ({
          ...prev,
          firmName: firm.firmName || "",
          firmId: firm.firmId || "",
          firmCode: firm.firmCode || "",
          distributorId: firm.distributorId || "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          firmName: "",
          firmId: "",
          firmCode: "",
          distributorId: result.distributorId || "",
        }));
      }

      return firms;
    } catch (error) {
      if (requestId === loadRequestId.current) {
        setRegisteredFirms([]);
        setFirmsLoaded(false);
      }

      if (showError) {
        alert("Server not connected. Please check backend is running.");
      }

      console.error(error);
      return [];
    } finally {
      if (requestId === loadRequestId.current) {
        setLoadingFirms(false);
      }
    }
  };

  useEffect(() => {
    if (mode !== "login") return;

    const userName = formData.userName.trim();
    const password = formData.password;

    setRegisteredFirms([]);
    setFirmsLoaded(false);
    setFormData((prev) => ({
      ...prev,
      firmName: "",
      firmId: "",
      firmCode: "",
      distributorId: "",
    }));

    if (!userName || !password) return;

    const timer = setTimeout(() => {
      loadUserFirms(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [mode, formData.userName, formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "firmId" && mode === "login") {
      const selectedFirm = registeredFirms.find(
        (firm) => firm.firmId === value
      );

      setFormData((prev) => ({
        ...prev,
        firmId: selectedFirm ? selectedFirm.firmId : "",
        firmName: selectedFirm ? selectedFirm.firmName : "",
        firmCode: selectedFirm ? selectedFirm.firmCode : "",
        distributorId: selectedFirm ? selectedFirm.distributorId : "",
      }));

      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetLoginForm = () => {
    setRegisteredFirms([]);
    setFirmsLoaded(false);

    setFormData({
      ...emptyForm,
      userName: "",
      password: "",
    });
  };

  const resetRegisterForm = () => {
    setRegisteredFirms([]);
    setFirmsLoaded(false);
    setFormData({ ...emptyForm });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (mode === "register") {
        const distributorData = {
          firmCode: formData.firmCode.trim(),
          firmName: formData.firmName.trim(),
          address1: formData.address1.trim(),
          address2: formData.address2.trim(),
          city: formData.city.trim(),
          pinCode: formData.pinCode.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          phoneNo: formData.phoneNo.trim(),
          mobileNo: formData.mobileNo.trim(),
          tinNo: formData.tinNo.trim(),
          regNo: formData.regNo.trim(),
          gstNo: formData.gstNo.trim(),
          drugLicNo: formData.drugLicNo.trim(),
          foodLicenceNo: formData.foodLicenceNo.trim(),
          distributorId: formData.distributorId.trim(),
          apiKey: formData.apiKey.trim(),
          email: formData.email.trim(),
          userName: formData.userName.trim(),
          password: formData.password,
        };

        const response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(distributorData),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.message || "Registration failed");
          return;
        }

        const savedFirm = result.data;

        alert(
          `Distributor registered successfully.\nDistributor ID: ${savedFirm.distributorId}\nFirm ID: ${savedFirm.firmId}`
        );

        setRegisteredFirms([savedFirm]);
        setFirmsLoaded(true);
        setMode("login");
        setShowPassword(false);

        setFormData({
          ...emptyForm,
          firmCode: savedFirm.firmCode || "",
          firmName: savedFirm.firmName || "",
          firmId: savedFirm.firmId || "",
          distributorId: savedFirm.distributorId || "",
          userName: savedFirm.userName || "",
          password: distributorData.password,
          workingDate: getTodayDate(),
        });

        return;
      }

      const userName = formData.userName.trim();

      if (!userName || !formData.password) {
        alert("Please enter username and password");
        return;
      }

      let firms = registeredFirms;

      if (!firmsLoaded || firms.length === 0) {
        firms = await loadUserFirms(true);
      }

      let selectedFirmId = formData.firmId;

      if (!selectedFirmId && firms.length === 1) {
        selectedFirmId = firms[0].firmId;
      }

      if (!selectedFirmId) {
        alert("Please select firm");
        return;
      }

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName,
          password: formData.password,
          firmId: selectedFirmId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Login failed");
        return;
      }

      localStorage.setItem("token", "login-success");
      localStorage.setItem("distributorId", result.user.distributorId);
      localStorage.setItem("firmId", result.user.firmId);
      localStorage.setItem("firmCode", result.user.firmCode);
      localStorage.setItem("firmName", result.user.firmName);
      localStorage.setItem("userName", result.user.userName);
      localStorage.setItem(
        "workingDate",
        formData.workingDate || getTodayDate()
      );
      localStorage.setItem("role", result.user.role || "DISTRIBUTOR_ADMIN");

      onLoginSuccess();
    } catch (error) {
      alert("Server not connected. Please check backend is running.");
      console.error(error);
    }
  };

  const switchMode = () => {
    setShowPassword(false);

    if (mode === "login") {
      setMode("register");
      resetRegisterForm();
    } else {
      setMode("login");
      resetLoginForm();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="circle-bg"></div>
          <div className="dot-bg"></div>

          <div className="auth-form-box">
            <div className="auth-mark">
              <span></span>
              <span></span>
            </div>

            <h2>
              {mode === "login" ? (
                <>
                  Welcome <span>Back!</span>
                </>
              ) : (
                <>
                  Register <span>Distributor!</span>
                </>
              )}
            </h2>

            <p className="auth-subtitle">
              {mode === "login"
                ? "Sign in to access your ERP dashboard"
                : "Create your distributor ERP account"}
            </p>

            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>Firm Code</label>
                      <div className="input-box">
                        <span className="input-icon">🏢</span>
                        <input
                          type="text"
                          name="firmCode"
                          value={formData.firmCode}
                          onChange={handleChange}
                          placeholder="Enter firm code"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Firm Name</label>
                      <div className="input-box">
                        <span className="input-icon">🏬</span>
                        <input
                          type="text"
                          name="firmName"
                          value={formData.firmName}
                          onChange={handleChange}
                          placeholder="Enter firm name"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Address 1</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="address1"
                          value={formData.address1}
                          onChange={handleChange}
                          placeholder="Enter address 1"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>Address 2</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="address2"
                          value={formData.address2}
                          onChange={handleChange}
                          placeholder="Enter address 2"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>City</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Enter city"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Pin Code</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="pinCode"
                          value={formData.pinCode}
                          onChange={handleChange}
                          placeholder="Enter pin code"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>State</label>
                      <div className="input-box select-box">
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                        >
                          <option value="">Select State</option>
                          {indianStates.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Country</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="country"
                          list="countryList"
                          value={formData.country}
                          onChange={handleChange}
                          placeholder="Search country"
                        />
                        <datalist id="countryList">
                          {countries.map((country) => (
                            <option key={country} value={country} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Phone No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="phoneNo"
                          value={formData.phoneNo}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>Mobile No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="mobileNo"
                          value={formData.mobileNo}
                          onChange={handleChange}
                          placeholder="Enter mobile number"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Tin No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="tinNo"
                          value={formData.tinNo}
                          onChange={handleChange}
                          placeholder="Enter tin number"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Reg No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="regNo"
                          value={formData.regNo}
                          onChange={handleChange}
                          placeholder="Enter registration number"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>GST No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="gstNo"
                          value={formData.gstNo}
                          onChange={handleChange}
                          placeholder="Enter GST number"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Drug Lic No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="drugLicNo"
                          value={formData.drugLicNo}
                          onChange={handleChange}
                          placeholder="Enter drug licence number"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Food Licence No.</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="foodLicenceNo"
                          value={formData.foodLicenceNo}
                          onChange={handleChange}
                          placeholder="Enter food licence number"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnRowStyle}>
                    <div className="form-group">
                      <label>Distributor Id</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="distributorId"
                          value={formData.distributorId}
                          onChange={handleChange}
                          placeholder="Auto generated if blank"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Api Key</label>
                      <div className="input-box">
                        <input
                          type="text"
                          name="apiKey"
                          value={formData.apiKey}
                          onChange={handleChange}
                          placeholder="Enter api key"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <div className="input-box">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>User Name</label>
                <div className="input-box">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    placeholder="Enter user name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-box">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />

                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <>
                  <div className="form-group">
                    <label>Firm Name</label>
                    <div className="input-box select-box">
                      <span className="input-icon">🏬</span>
                      <select
                        name="firmId"
                        value={formData.firmId}
                        onChange={handleChange}
                        required
                        disabled={
                          loadingFirms ||
                          !formData.userName.trim() ||
                          !formData.password
                        }
                      >
                        <option value="">
                          {loadingFirms
                            ? "Loading firms..."
                            : registeredFirms.length > 0
                            ? "Select Firm"
                            : "Enter username and password"}
                        </option>

                        {registeredFirms.map((firm) => (
                          <option
                            key={firm.firmId || firm._id}
                            value={firm.firmId}
                          >
                            {firm.firmName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Working Date</label>
                    <div className="input-box">
                      <span className="input-icon">📅</span>
                      <input
                        type="date"
                        name="workingDate"
                        value={formData.workingDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="auth-options">
                    <label className="remember">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>

                    <button type="button" className="forgot-btn">
                      Forgot Password?
                    </button>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="auth-btn"
                disabled={mode === "login" && loadingFirms}
              >
                <span>
                  {mode === "login"
                    ? loadingFirms
                      ? "Loading Firms..."
                      : "🔒 Login"
                    : "Register Distributor"}
                </span>
                <b>→</b>
              </button>
            </form>

            <div className="divider">
              <span></span>
              <p>or</p>
              <span></span>
            </div>

            <p className="switch-text">
              {mode === "login"
                ? "Don’t have a distributor account?"
                : "Already have an account?"}{" "}
              <button type="button" onClick={switchMode}>
                {mode === "login" ? "Register Distributor" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;