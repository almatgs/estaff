function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( this.user_id != LdsCurUser.id )
		Cancel();
}


function use_login()
{
	if ( this.type_id == 'recruit_provider' )
		return false;

	return true;
}


function use_password()
{
	if ( this.type_id == 'recruit_provider' )
		return false;

	return this.auth_method_id != 'oauth' || ( this.type_id == 'imod_site' && this.imod_site_id.ForeignElem.use_password );
}


function use_access_token()
{
	if ( this.type_id == 'recruit_provider' )
		return this.recruit_provider_id.ForeignElem.std_provider_id.ForeignElem.use_account_access_token;

	return ( this.auth_method_id == 'oauth' );
}


function access_token_is_read_only()
{
	if ( this.type_id == 'recruit_provider' )
		return false;

	return true;
}


function use_refresh_token()
{
	if ( this.type_id == 'recruit_provider' )
		return false;

	return true;
}