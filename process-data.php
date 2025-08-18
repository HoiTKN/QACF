<?php
// api/process-data.php - MySQL API for Process Data Component
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://qa.iot-mmb.site');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database configuration
$host = 'db.iot-mmb.site';
$dbname = 'qa';
$username = 'hoitkn';
$password = 'Masan@123456';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    case 'PUT':
        handlePut($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleGet($pdo) {
    try {
        // Get specific record by ID or all records with filters
        $id = $_GET['id'] ?? null;
        
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM Processmi WHERE id = ?");
            $stmt->execute([$id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($record) {
                echo json_encode(['success' => true, 'data' => $record]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Record not found']);
            }
        } else {
            // Get all records with optional filters
            $site = $_GET['site'] ?? null;
            $date_from = $_GET['date_from'] ?? null;
            $date_to = $_GET['date_to'] ?? null;
            $limit = intval($_GET['limit'] ?? 100);
            
            $query = "SELECT * FROM Processmi WHERE 1=1";
            $params = [];
            
            if ($site) {
                $query .= " AND Site = ?";
                $params[] = $site;
            }
            
            if ($date_from) {
                $query .= " AND `NSX (Ngày sản xuất)` >= ?";
                $params[] = $date_from;
            }
            
            if ($date_to) {
                $query .= " AND `NSX (Ngày sản xuất)` <= ?";
                $params[] = $date_to;
            }
            
            $query .= " ORDER BY `NSX (Ngày sản xuất)` DESC, `Giờ kiểm tra` DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $records, 'count' => count($records)]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch data: ' . $e->getMessage()]);
    }
}

function handlePost($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            return;
        }
        
        // Validate required fields
        $required_fields = ['site', 'maNhanVien', 'lineSX', 'maDKSX'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || trim($input[$field]) === '') {
                http_response_code(400);
                echo json_encode(['error' => "Missing required field: $field"]);
                return;
            }
        }
        
        // Combine description fields (Option A)
        $combinedDescription = '';
        if (!empty($input['moTaCamQuan'])) {
            $combinedDescription = $input['moTaCamQuan'];
        }
        if (!empty($input['moTaSoi'])) {
            if ($combinedDescription) {
                $combinedDescription .= " | Mô tả sợi: " . $input['moTaSoi'];
            } else {
                $combinedDescription = "Mô tả sợi: " . $input['moTaSoi'];
            }
        }
        
        // Map form fields to database columns
        $fieldMapping = [
            'site' => 'Site',
            'maNhanVien' => 'Mã nhân viên QA',
            'nsx' => 'NSX (Ngày sản xuất)',
            'gioKiemTra' => 'Giờ kiểm tra',
            'lineSX' => 'Line SX',
            'maDKSX' => 'Mã ĐKSX',
            'brixKansui' => 'Brix Kansui',
            'nhietDoKansui' => 'Nhiệt độ Kansui',
            'ngoaiQuanKansui' => 'Ngoại quan Kansui',
            'brixSeasoning' => 'Brix Seasoning',
            'ngoaiQuanSeasoning' => 'Ngoại quan Seasoning',
            'doDayLaBot' => 'Độ dày lá bột (mm)',
            'ngoaiQuanSoi' => 'Ngoại quan sợi',
            'apSuatHoiVan' => 'Áp suất hơi van thành phần',
            'nhietDauTrai' => 'Đầu trái',
            'nhietDauPhai' => 'Đầu phải',
            'nhietGiua1Trai' => 'Giữa 1 trái',
            'nhietGiua1Phai' => 'Giữa 1 phải',
            'nhietGiua2Trai' => 'Giữa 2 trái',
            'nhietGiua2Phai' => 'Giữa 2 phải',
            'nhietGiua3Trai' => 'Giữa 3 trái',
            'nhietGiua3Phai' => 'Giữa 3 phải',
            'nhietCuoiTrai' => 'Cuối trái',
            'nhietCuoiPhai' => 'Cuối phải',
            'ngoaiQuanPhoiMi' => 'Ngoại quan phôi mì',
            'vanChamBHA' => 'Van châm BHA/BHT',
            'camQuanCoTinh' => 'Cơ tính sợi',
            'camQuanMau' => 'Màu sắc',
            'camQuanMui' => 'Mùi',
            'camQuanVi' => 'Vị'
        ];
        
        // Build SQL query
        $columns = array_values($fieldMapping);
        $columns[] = 'Mô tả cảm quan (nếu có)'; // Add combined description column
        
        $placeholders = array_fill(0, count($columns), '?');
        
        $sql = "INSERT INTO Processmi (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
        
        // Prepare values
        $values = [];
        foreach ($fieldMapping as $formField => $dbColumn) {
            $value = $input[$formField] ?? null;
            // Convert empty strings to null for numeric fields
            if ($value === '' || $value === 'null') {
                $value = null;
            }
            $values[] = $value;
        }
        
        // Add combined description
        $values[] = $combinedDescription ?: null;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Dữ liệu đã được lưu thành công',
            'id' => $id,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save data: ' . $e->getMessage()]);
    }
}

function handlePut($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID is required for update']);
            return;
        }
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            return;
        }
        
        // Field mapping for updates
        $fieldMapping = [
            'site' => 'Site',
            'maNhanVien' => 'Mã nhân viên QA',
            'nsx' => 'NSX (Ngày sản xuất)',
            'gioKiemTra' => 'Giờ kiểm tra',
            'lineSX' => 'Line SX',
            'maDKSX' => 'Mã ĐKSX',
            'brixKansui' => 'Brix Kansui',
            'nhietDoKansui' => 'Nhiệt độ Kansui',
            'ngoaiQuanKansui' => 'Ngoại quan Kansui',
            'brixSeasoning' => 'Brix Seasoning',
            'ngoaiQuanSeasoning' => 'Ngoại quan Seasoning',
            'doDayLaBot' => 'Độ dày lá bột (mm)',
            'ngoaiQuanSoi' => 'Ngoại quan sợi',
            'apSuatHoiVan' => 'Áp suất hơi van thành phần',
            'nhietDauTrai' => 'Đầu trái',
            'nhietDauPhai' => 'Đầu phải',
            'nhietGiua1Trai' => 'Giữa 1 trái',
            'nhietGiua1Phai' => 'Giữa 1 phải',
            'nhietGiua2Trai' => 'Giữa 2 trái',
            'nhietGiua2Phai' => 'Giữa 2 phải',
            'nhietGiua3Trai' => 'Giữa 3 trái',
            'nhietGiua3Phai' => 'Giữa 3 phải',
            'nhietCuoiTrai' => 'Cuối trái',
            'nhietCuoiPhai' => 'Cuối phải',
            'ngoaiQuanPhoiMi' => 'Ngoại quan phôi mì',
            'vanChamBHA' => 'Van châm BHA/BHT',
            'camQuanCoTinh' => 'Cơ tính sợi',
            'camQuanMau' => 'Màu sắc',
            'camQuanMui' => 'Mùi',
            'camQuanVi' => 'Vị'
        ];
        
        // Build dynamic update query
        $fields = [];
        $params = [];
        
        foreach ($fieldMapping as $formField => $dbColumn) {
            if (array_key_exists($formField, $input)) {
                $fields[] = "`$dbColumn` = ?";
                $value = $input[$formField];
                if ($value === '' || $value === 'null') {
                    $value = null;
                }
                $params[] = $value;
            }
        }
        
        // Handle combined description if either field is provided
        if (array_key_exists('moTaCamQuan', $input) || array_key_exists('moTaSoi', $input)) {
            $combinedDescription = '';
            if (!empty($input['moTaCamQuan'])) {
                $combinedDescription = $input['moTaCamQuan'];
            }
            if (!empty($input['moTaSoi'])) {
                if ($combinedDescription) {
                    $combinedDescription .= " | Mô tả sợi: " . $input['moTaSoi'];
                } else {
                    $combinedDescription = "Mô tả sợi: " . $input['moTaSoi'];
                }
            }
            $fields[] = "`Mô tả cảm quan (nếu có)` = ?";
            $params[] = $combinedDescription ?: null;
        }
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            return;
        }
        
        $params[] = $id;
        $sql = "UPDATE Processmi SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Record updated successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Record not found or no changes made']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update data: ' . $e->getMessage()]);
    }
}

function handleDelete($pdo) {
    try {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID is required for deletion']);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM Processmi WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Record deleted successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Record not found']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete data: ' . $e->getMessage()]);
    }
}
?>
