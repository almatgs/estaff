function SendEmail(HostName, IsSelectUser)
{
    if (IsSelectUser) {

        user_id = lib_base.select_object_from_view('users_with_workload');

        user = GetForeignElem(users, user_id);
        user_login = user.login;
        user_email = '';
        if (user.person_id.HasValue) 
            user_email = GetForeignElem(persons, user.person_id).email;
    }
    else {

        user_login = lib_user.active_user_info.login;
        user_email = lib_user.GetCurrentUserPerson().email;
    }

    settings = new Object;
    settings.login = user_login;
    settings.server = HostName;
    settings.port = '';
    settings.password = '';
    settings.https = false;

    if (StrContains(HostName, ':') && (obj = StrOptScan(HostName, '%s:%s')) != undefined) {

        settings.server = obj[0];
        settings.port = obj[1];
    }

    message = new MailMessage();
    message.subject = 'Mobile settings';
    message.body = 'Use CallerID App to open attached file.';
    message.recipients.AddChild().address = user_email;

    messageAttc = message.attachments.AddChild();
    messageAttc.name = 'mobile_settings.adtxs';
    messageAttc.data = EncodeJson(settings);

    lib_outlook.show_mail_message(message);
}
