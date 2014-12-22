$(document).ready(function() {

    var validateData = function(){
        website = $("#in_website").val();
        email = $("#in_email").val();
        if (website != '' && email != '') return true;
        return false;

    };

    $('#submit_btn').click(function () {

        if (validateData()){
            $.post('signup', { website: $("#in_website").val(), email : $("#in_email").val()},
                function(returnedData){
                    console.log(returnedData);
                    if (returnedData.status == 'ok'){
                        $(".alert").removeClass("alert-danger");
                        $(".alert").addClass("alert-info");
                        $(".alert").text("I've succsessfuly signed up for Internal Page Rank. We will send you an email soon! " + returnedData.host);
                        $(".alert").show().delay(10000).slideUp(1000);
                    } else {
                        $(".alert").removeClass("alert-info");
                        $(".alert").addClass("alert-danger");
                        $(".alert").text(returnedData.message);
                        $(".alert").show().delay(9000).slideUp(1000);
                    }


                }, 'json');
        } else {
            $(".alert").text("Please enter valid data");
            $(".alert").show().delay(9000).slideUp(1000);
        }

    });
});
//$('#login-form').ajaxForm({
//    beforeSubmit : function(formData, jqForm, options){
//        if (lv.validateForm() == false){
//            return false;
//        } else{
//// append 'remember-me' option to formData to write local cookie //
//            formData.push({name:'remember-me', value:$("input:checkbox:checked").length == 1})
//            return true;
//        }
//    },
//    success : function(responseText, status, xhr, $form){
//        if (status == 'success') window.location.href = '/';
//    },
//    error : function(e){
//        console.log('Login Failure', 'Please check your username and/or password');
//    }
//});