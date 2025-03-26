<?php

session_start();


$userdata = $_SESSION['userdata'];
$aadhaar = $userdata['aadhaar_no'];
$name = $userdata['name'];
$voter_id =$userdata["voter_id"];
$ward_no= $userdata["ward_no"];
$polling_area=$userdata["polling_area"];

echo $aadhaar."<br>".$name."<br>".$voter_id."<br>".$ward_no."<br>"."polling area:".$polling_area;

?>