<?php

$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://sandbox.cashfree.com/verification/offline-aadhaar/otp",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "POST",
  CURLOPT_POSTFIELDS => "{\n  \"aadhaar_number\": \"895960815199\"\n}",
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-client-id: CF10517514CVBT57NSI14C73EO80QG",
    "x-client-secret: cfsk_ma_test_13983b623d71ecdfb1be3f9cc10a3d01_b1a06247"
  ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}