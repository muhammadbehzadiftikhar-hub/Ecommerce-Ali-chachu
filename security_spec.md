# Firestore Security Specification

This specification governs the validation, access control, and identity constraints for the e-commerce database. It outlines our core data invariants, the twelve simulated malicious payloads (The "Dirty Dozen") trying to bypass safety rules, and the logical gates that defend against them.

## 1. Core Data Invariants

1. **Role Protection**: Only authentic Admins configured in `/admins/{uid}` can modify product catalogs, categories, and update other order statuses.
2. **PII Isolation**: Complete guest or registered customer order details and PII (shippingAddress, contact fields) can only be viewed or modified by the creator user or authenticated Admins.
3. **Price/Order Integrity**: Customers cannot set or update prices of product items. The total, subtotal, and pricing fields are locked and calculated purely by the checkout servers or validated during checkout creation. No user can change field values like `price` or `total` after creation.
4. **No Shadow Fields**: All collection document writes must strictly adhere to allowed field lists and schema structures. No arbitrary ghost props can be injected.
5. **Terminal Locks**: Orders marked as `CANCELLED`, `DELIVERED`, or `REFUNDED` (terminal states) cannot bypass state updates without Admin overrides.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads are designed to attack the system but will trigger a strict `PERMISSION_DENIED` rule gate:

### 1. Self-Promoted Admin (Privilege Escalation)
A user tries to set their role to `ADMIN` during creation.
* **Payload**: `/users/attacker1234` -> `{ name: "Attacker", email: "attacker@gmail.com", role: "ADMIN" }`
* **Defeated By**: `isValidUser()` checks that prevent modifying the role field in standard writes or require verified Admin status to write.

### 2. Price Tampering (Identity/Integrity)
An attacker tries to update the price of a luxury product down to $0.01.
* **Payload**: `/products/luxury_watch` -> `{ price: 0.01 }`
* **Defeated By**: Product write permissions restricted strictly to `isAdmin()`.

### 3. Alien Order hijacking (Identity Leak)
A user tries to retrieve or edit another user's private order document.
* **Payload**: `/orders/order_777_owner_bob` -> Get/Update request from authenticated user `alice`.
* **Defeated By**: `isOwner(resource.data.userId)` or `resource.data.email == request.auth.token.email`.

### 4. Shadow Field Injection (Anti-Update-Gap)
An attacker attempts to write an arbitrary `isVerifiedBuyer: true` or `discountCodeApplied: true` prop to a review or order resource.
* **Payload**: `/products/hat/reviews/rev1` -> `{ rating: 5, comment: "Nice!", isVerifiedBuyer: true }`
* **Defeated By**: `affectedKeys().hasOnly(['rating', 'comment'])` on reviews updates, and size checks matches on creation.

### 5. Inventory Theft (No State Gate)
An attacker attempts to set a product's available quantity directly to `99999` to ruin stock management.
* **Payload**: `/products/sneaker` -> `{ quantity: 99999 }` from standard customer client.
* **Defeated By**: All product writes restricted to `isAdmin()`.

### 6. Order Status Skipping to SHIPPED
An attacker attempts to mark their own pending order draft as `SHIPPED` or `DELIVERED` without making a payment.
* **Payload**: `/orders/order_pending` -> `{ status: "SHIPPED" }`
* **Defeated By**: Customer updates on orders are strictly limited (cannot change status/paymentStatus). Only `isAdmin()` or backend server context can modify order delivery states.

### 7. ID Poisoning (Resource Abuse)
An attacker injects a 500KB random payload string as a product/order slug or document ID to cause a Denial of Wallet attack.
* **Payload**: Document creation with ID: `/products/LONG_JUNK_ID_500KB...`
* **Defeated By**: Global `isValidId()` restricting ID strings to size <= 128 characters conforming to alphanumeric regex.

### 8. Denial of Wallet via Unbounded Images List
An attacker tries to upload 10,000 placeholder image items inside a product's image gallery list.
* **Payload**: `/products/custom_mug` -> `{ images: [ ...10000 image links... ] }`
* **Defeated By**: `.size() <= 10` boundary constraints on array types.

### 9. PII Query Scraping (Blanket Reads)
A client tries to fetch all users' billing details by issuing a query without filtering by `userId`.
* **Payload**: `db.collection('orders').get()`
* **Defeated By**: Rule level query enforcement checking `resource.data.userId == request.auth.uid`.

### 10. Review Spoofing (Identity Theft)
An authenticated user `alice` tries to submit a product review claiming to be signed in as `bob`.
* **Payload**: `/products/iphone/reviews/rev_new` -> `{ rating: 5, comment: "Loved it!", userId: "bob" }` (Alice is writing, but bob's ID is supplied in payload).
* **Defeated By**: Identity Integrity rule matching `incoming().userId == request.auth.uid`.

### 11. Relational Orphan Write (Null Parent check)
A client tries to create a detailed shipping address under a user ID that does not exist.
* **Payload**: `/users/dead_user_id/addresses/addr1`
* **Defeated By**: Parent document Relational Sync via `exists(/databases/$(database)/documents/users/$(userId))`.

### 12. Timestamp Fabricator (Temporal Integrity)
A malicious client tries to set their order checkout or review timestamp to a future year `2050` or past year `2000` to manipulate statistics.
* **Payload**: `/products/shirt/reviews/rev12` -> `{ createdAt: "2050-01-01T00:00:00Z" }`
* **Defeated By**: Strict validation gate: `incoming().createdAt == request.time`.
