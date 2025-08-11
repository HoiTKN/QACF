// js/config.js

const APP_CONFIG = {
    // Azure AD / MSAL Configuration
    msalConfig: {
        auth: {
            clientId: "076541aa-c734-405e-8518-ed52b67f8cbd",
            authority: "https://login.microsoftonline.com/81060475-7e7f-4ede-8d8d-bf61f53ca528",
            redirectUri: "https://qa.iot-mmb.site/"  // Domain mới của bạn
        },
        cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false
        }
    },
    
    // API Scopes
    loginRequest: {
        scopes: ["User.Read", "Sites.ReadWrite.All"]
    },
    
    // SharePoint Configuration
    sharePoint: {
        siteUrl: "https://masangroup.sharepoint.com/sites/MCH.MMB.QA",
        processDataListName: "Process data",
        processParameterListName: "Process parameter"
    },
    
    // Graph API Endpoints
    graphEndpoints: {
        me: "https://graph.microsoft.com/v1.0/me",
        site: "https://graph.microsoft.com/v1.0/sites/masangroup.sharepoint.com:/sites/MCH.MMB.QA",
        lists: "https://graph.microsoft.com/v1.0/sites/{siteId}/lists",
        listItems: "https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}/items"
    },
    
    // App Settings
    app: {
        version: "1.0.0",
        debug: true, // Set to false in production
        offlineEnabled: true,
        maxOfflineRecords: 50,
        syncInterval: 30000 // 30 seconds
    },
    
    // Column Mappings for Process Data
    processDataColumns: {
        "Site": "Site",
        "MaNhanVienQA": "M_x00e3__x0020_nh_x00e2_n_x0020_", // Internal name may be different
        "NSX": "NSX",
        "GioKiemTra": "Gi_x1edd__x0020_ki_x1ec3_m_x002",
        "LineSX": "Line_x0020_SX",
        "SanPham": "S_x1ea3_n_x0020_ph_x1ea9_m",
        "MaDKSX": "M_x00e3__x0020__x0110_KSX",
        "BrixKansui": "Brix_x0020_Kansui",
        "NhietDoKansui": "Nhi_x1ec7_t_x0020__x0111__x1ed9_",
        "NgoaiQuanKansui": "Ngo_x1ea1_i_x0020_quan_x0020_Kan",
        "KetLuanKVKansui": "K_x1ebf_t_x0020_lu_x1ead_n_x0020_",
        "BrixSeasoning": "Brix_x0020_Seasoning",
        "NgoaiQuanSeasoning": "Ngo_x1ea1_i_x0020_quan_x0020_sea",
        "KetLuanSeasoning": "K_x1ebf_t_x0020_lu_x1ead_n_x0020_0",
        "DoDayLaBot": "_x0110__x1ed9__x0020_d_x00e0_y_x",
        "NhietDauTrai": "Nhi_x1ec7_t_x0020__x0111__x1ea7_u",
        "NhietDauPhai": "Nhi_x1ec7_t_x0020__x0111__x1ea7_u0",
        "NhietGiua1Trai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x00",
        "NhietGiua1Phai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x000",
        "NhietGiua2Trai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x001",
        "NhietGiua2Phai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x002",
        "NhietGiua3Trai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x003",
        "NhietGiua3Phai": "Nhi_x1ec7_t_x0020_gi_x1eef_a_x004",
        "NhietCuoiTrai": "Nhi_x1ec7_t_x0020_cu_x1ed1_i_x00",
        "NhietCuoiPhai": "Nhi_x1ec7_t_x0020_cu_x1ed1_i_x000",
        "CamQuanCoTinh": "C_x1ea3_m_x0020_quan_x0020_c_x01",
        "CamQuanMau": "C_x1ea3_m_x0020_quan_x0020_m_x00",
        "CamQuanMui": "C_x1ea3_m_x0020_quan_x0020_m_x00e",
        "CamQuanVi": "C_x1ea3_m_x0020_quan_x0020_v_x1ec"
    }
};

// Validation rules (will be loaded from SharePoint)
const VALIDATION_RULES = {
    brixKansui: { min: 7.0, max: 10.0 },
    nhietKansui: { min: 15, max: 30 },
    brixSeasoning: { min: 0, max: 50 },
    doDayLaBot: { min: 0.5, max: 2.0 },
    nhietDau: { min: 140, max: 180 },
    nhietGiua: { min: 140, max: 180 },
    nhietCuoi: { min: 140, max: 180 }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, VALIDATION_RULES };
}
