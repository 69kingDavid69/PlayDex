import Foundation
import Security

enum KeychainStoreError: Error, LocalizedError {
    case unexpectedStatus(OSStatus)
    case invalidData

    var errorDescription: String? {
        switch self {
        case .unexpectedStatus(let status):
            return "Keychain devolvio el estado \(status)."
        case .invalidData:
            return "No fue posible decodificar el valor almacenado en Keychain."
        }
    }
}

enum KeychainStore {
    private static let service = "com.codex.PlayDex"
    private static let legacyServices = ["com.codex.DeemixiTunes"]

    static func read(account: String) throws -> String? {
        if let currentValue = try read(account: account, service: service) {
            return currentValue
        }

        for legacyService in legacyServices {
            if let legacyValue = try read(account: account, service: legacyService) {
                try? save(legacyValue, account: account)
                return legacyValue
            }
        }

        return nil
    }

    static func save(_ value: String, account: String) throws {
        let data = Data(value.utf8)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecSuccess {
            return
        }

        if updateStatus != errSecItemNotFound {
            throw KeychainStoreError.unexpectedStatus(updateStatus)
        }

        var createQuery = query
        createQuery[kSecValueData as String] = data

        let createStatus = SecItemAdd(createQuery as CFDictionary, nil)
        guard createStatus == errSecSuccess else {
            throw KeychainStoreError.unexpectedStatus(createStatus)
        }
    }

    private static func read(account: String, service: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            guard
                let data = result as? Data,
                let value = String(data: data, encoding: .utf8)
            else {
                throw KeychainStoreError.invalidData
            }
            return value
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainStoreError.unexpectedStatus(status)
        }
    }
}
