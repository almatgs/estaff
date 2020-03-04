function use_object_field( objectTypeID, fieldID, sectionID )
{
	targetObjectType = object_types.GetOptChildByKey( objectTypeID );
	if ( targetObjectType == undefined )
		return use_object_field_by_default( objectTypeID, fieldID, sectionID );

	targetField = targetObjectType.fields.GetOptChildByKey( fieldID );
	if ( targetField == undefined )
		return use_object_field_by_default( objectTypeID, fieldID, sectionID );

	if ( ! targetField.use )
		return false;

	if ( sectionID == undefined )
		return true;

	formElem = GetObjectFormElem( objectTypeID ).Child( fieldID );
	defaultSectionID = formElem.GetOptAttr( 'default-section' );
	if ( defaultSectionID == undefined )
		return true;

	if ( targetField.sections.ChildNum != 0 )
		return targetField.sections.ChildByValueExists( sectionID );

	return ( sectionID == defaultSectionID );
}


function use_object_field_by_default( objectTypeID, fieldID, sectionID )
{
	formElem = GetObjectFormElem( objectTypeID ).Child( fieldID );
	if ( formElem.GetBoolAttr( 'hide-by-default' ) )
		return false;

	if ( sectionID == undefined )
		return true;

	defaultSectionID = formElem.GetOptAttr( 'default-section' );
	if ( defaultSectionID == undefined )
		return true;
	
	return ( sectionID == defaultSectionID )
}


function UseSomeOfObjectFields( objectTypeID, fieldIDs, sectionID )
{
	for ( fieldID in fieldIDs.split( ',' ) )
	{
		if ( use_object_field( objectTypeID, fieldID, sectionID ) )
			return true;
	}

	return false;
}


function get_object_field_default_section( objectTypeID, fieldID )
{
	formElem = GetObjectFormElem( objectTypeID ).Child( fieldID );
	return formElem.GetOptAttr( 'default-section' );
}


function set_use_object_field( objectTypeID, fieldID, use )
{
	targetObjectType = object_types.ObtainChildByKey( objectTypeID );
	targetField = targetObjectType.fields.ObtainChildByKey( fieldID );

	targetField.use = use;
}


function is_object_field_required( objectTypeID, fieldID )
{
	targetObjectType = object_types.GetOptChildByKey( objectTypeID );
	if ( targetObjectType == undefined )
		return is_object_field_required_by_default( objectTypeID, fieldID );

	targetField = targetObjectType.fields.GetOptChildByKey( fieldID );
	if ( targetField == undefined )
		return is_object_field_required_by_default( objectTypeID, fieldID );

	if ( ! targetField.is_required.HasValue )
		return is_object_field_required_by_default( objectTypeID, fieldID );

	return targetField.is_required;
}


function is_object_field_required_by_default( objectTypeID, fieldID )
{
	return false;
}


function set_object_field_required( objectTypeID, fieldID, isRequired, fieldDesc )
{
	targetObjectType = object_types.ObtainChildByKey( objectTypeID );
	targetField = targetObjectType.fields.ObtainChildByKey( fieldID );

	targetField.is_required = isRequired;
	
	if ( fieldDesc != undefined )
		targetField.desc = fieldDesc;
}


function check_object_required_fields( object )
{
	objectTypeID = object.Name;

	targetObjectType = object_types.GetOptChildByKey( objectTypeID );
	if ( targetObjectType == undefined )
		return;

	failedElemsArray = new Array();

	for ( targetField in targetObjectType.fields )
	{
		if ( ! targetField.is_required )
			continue;

		if ( ! targetField.use )
			continue;

		formElem = object.FormElem.OptChild( targetField.id );
		if ( formElem != undefined && formElem.IsSecondary )
			continue;

		elem = object.OptChild( targetField.id );
		if ( elem != undefined )
		{
			if ( elem.Type == '' )
			{
				if ( elem.ChildNum == 0 )
					failedElemsArray.push( elem );
			}
			else
			{
				if ( ! elem.HasValue )
					failedElemsArray.push( elem );
			}
		}
		else if ( formElem != undefined )
		{
			if ( formElem.IsMultiple )
			{
				failedElemsArray.push( formElem );
			}
			else
			{
				val = RValue( GetObjectProperty( object, targetField.id ) );
				if ( val == '' || val == null )
					failedElemsArray.push( formElem );
			}
		}
		else if ( targetField.desc.HasValue )
		{
			with ( object )
			{
				val = RValue( eval( targetField.id ) );
			}

			if ( val == '' || val == null )
				failedElemsArray.push( {Title: targetField.desc} );
		}
		else
		{
			//throw UserError( 'Invalid required element: ' + targetField.id );
		}
	}

	if ( ArrayCount( failedElemsArray ) == 0 )
		return;

	throw UiError( UiText.errors.required_fields_not_set + ':\r\n' + ArrayMerge( failedElemsArray, 'Title', '\r\n' ) );
}


function check_object_required_attc( object )
{
	failedElemsArray = new Array();

	for ( attachment in object.attachments )
	{
		if ( attachment.is_plain_text )
		{
			if ( ! attachment.plain_text.HasValue )
				failedElemsArray.push( attachment );
		}
		else if ( attachment.is_text )
		{
			if ( attachment.text.Size < 512 && Trim( attachment.resolve_plain_text() ) == '' )
				failedElemsArray.push( attachment );
		}
	}

	if ( ArrayCount( failedElemsArray ) == 0 )
		return;

	throw UserError( UiText.errors.required_card_attachments_not_set + ':\r\n' + ArrayMerge( failedElemsArray, 'name_desc', '\r\n' ) );
}


function get_field_ext_title( field, title )
{
	if ( title != undefined )
		str = title;
	else
		str = field.Title;

	if ( AppModuleUsed( 'module_nokian' ) )
	{
		objectTypeID = field.Parent.Name;

		if ( is_object_field_required( objectTypeID, field.Name ) )
			str += ' *';
	}

	return str;

}


function GetObjectFormElem( fragmentID )
{
	fragment = base1_config.field_usage_fragments.GetChildByKey( fragmentID );
	return GetFragmentFormElem( fragment );
}


function GetFragmentFormElem( fragment )
{
	if ( fragment.form_url.HasValue )
		form = FetchForm( fragment.form_url );
	else
		form = DefaultDb.GetObjectForm( fragment.object_type_id );
	
	return form.TopElem;
}