<?php
include('connect.php');

$party_name = $_POST['party_name'];
$party_icon = $_FILES['party_img']['name'];
$tmp_nm = $_FILES['party_img']['tmp_name'];
$path = "../party_icon/$party_icon";

move_uploaded_file($_FILES["party_img"]["tmp_name"], $path); 

    
    $insert = mysqli_query($connect, "INSERT INTO candidate (party_img, party_name) VALUES ('$party_icon', '$party_name')");
    
    if ($insert) {
        echo ' <script>
    alert("Candidate Added");
    window.location = "add_candidate.html";
    </script>'; 
    } else {
        echo ' <script>
        alert("Failed to add candidate");
        window.location = "../index.php";
        </script>'; 
}

?>
