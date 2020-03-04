function OnCheckAuth( Url, Login, Password, AuthType, Request )
{
	if ( AuthType == 'ntlm' )
	{
		if ( ( obj = StrOptScan( Login, '%s\\%s' ) ) != undefined )
			userLogin = obj[1];
		else
			userLogin = Login;

		userLogin = StrLowerCase( userLogin );
	}
	else
	{
		userLogin = Login;
	}

	user = ArrayOptFirstElem( XQuery( 'for $elem in users where $elem/login = \'' + userLogin + '\' and $elem/is_active = true() return $elem' ) );
	if ( user != undefined )
	{
		//if ( userLogin == 'kate' )
			//LogEvent( '', 'AUTH: user found: ' + ( user != undefined ) );

		if ( AuthType != 'ntlm' )
		{
			if ( user.password_hash.HasValue )
			{
				if ( ! PasswordVerify( Password, user.password_hash ) )
					return;
			}
			else if ( user.password.HasValue )
			{
				if ( Password != user.password  )
					return;
			}
			else
			{
				return;
			}
		}

		if ( base1_config.use_security_admin_role && user.need_approval )
			return;

		return user;
	}

	if ( AppModuleUsed( 'w4' ) )
		return lib_w4.OnCheckLdsAuth( Request, Url, Login, Password, AuthType );

	if ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) )
	{
		if ( AuthType == 'ntlm' )
		{
			person = lib_base.query_opt_record_by_key( persons, StrLowerCase( userLogin ), 'sys_login' );
			//if ( userLogin == 'kate' )
				//LogEvent( '', 'AUTH: person found (NTLM): ' + ( person != undefined ) );
			if ( person == undefined )
				return;
		}
		else
		{
			person = lib_base.query_opt_record_by_key( persons, StrLowerCase( userLogin ), 'sys_login' );
			//if ( userLogin == 'kate' )
				//LogEvent( '', 'AUTH: person found: ' + ( person != undefined ) );
			if ( person == undefined )
				return;

			if ( ! person.password_hash.HasValue )
				return;

			if ( ! PasswordVerify( Password, person.password_hash ) )
			{
				LogEvent( '', 'ERROR: Password mismatch for ' + userLogin );
				return;
			}
		}

		if ( person.account_disabled )
		{
			LogEvent( '', 'ERROR: Login attempt from disabled account: ' + userLogin );
			return;
		}

		if ( ! person.is_hiring_manager )
		{
			//throw UiError( 'Login does not belong to a hiring manager' );
			LogEvent( '', 'ERROR: Login attempt from a person which is not a hiring manager: ' + userLogin );
			return;
		}
			
		return person;
	}

	if ( AppModuleUsed( 'ws' ) )
		return lib_ws.on_check_lds_auth( Request, Url, Login, Password, AuthType );
}
