<?php
class SignatureGenerator {
    public static function getSignature() {
        $clientId = "CF10517514CVBT57NSI14C73EO80QG";
        $publicKey = openssl_pkey_get_public(file_get_contents("C:\Users\Akshay Jaiswal\Downloads\public-key\accountId_1217035_public_key.pem"));

        $encodedData = $clientId . "." . strtotime("now");
        return self::encrypt_RSA($encodedData, $publicKey);
    }

    private static function encrypt_RSA($plainData, $publicKey) { 
        if (openssl_public_encrypt($plainData, $encrypted, $publicKey, OPENSSL_PKCS1_OAEP_PADDING)) {
            return base64_encode($encrypted);
        } 
        return NULL;
    }
}

// Call the function
$signature = SignatureGenerator::getSignature();
echo $signature;
?>
