<?php
include('connect.php');

$party_name = $_POST['party_name'];


    $result = mysqli_query($connect, "SELECT party_img FROM candidate WHERE party_name = '$party_name'");
    
    if (mysqli_num_rows($result) > 0) {
        $row = mysqli_fetch_assoc($result);
        $party_img = $row['party_img'];


        $image_path = "../party_icon/" . $party_img;
        if (file_exists($image_path)) {
            unlink($image_path);
        }


        $delete = mysqli_query($connect, "DELETE FROM candidate WHERE party_name = '$party_name'");

        if ($delete) {
            echo '<script>
                alert("Candidate removed successfully.");
                window.location = "remove_candidate.html";
            </script>';
        } else {
            echo '<script>
                alert("Failed to remove candidate.");
                window.location = "remove_candidate.html";
            </script>';
        }
    } else {
        echo '<script>
            alert("Candidate not found.");
            window.location = "remove_candidate.html";
        </script>';
    }

?>
