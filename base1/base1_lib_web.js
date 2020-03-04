function build_web_view( Response, viewID, extQuery, outerEnv, codeQual )
{
	isDlg = StrContains( Response.OrigRequest.UrlPath, '_select.htm' );
	extQueryObj = UrlQuery( 'http://xxx/?' + extQuery );
	
	param = lib_view.build_view_param( viewID, extQuery );

	if ( StrBegins( viewID, 'candidates_of_vacancy' ) )
	{
		sourceDoc = OpenNewDoc( '//rcr/rcr_vacancy.xmd', 'separate=1' );
		source = sourceDoc.TopElem.view;
		filter = source.filter;

		filter.active_vacancy_id = extQueryObj.GetProperty( 'spots.spot.vacancy_id' );
	}
	else
	{
		sourceDoc = OpenDocFromStr( '<temp></temp>' );
		source = sourceDoc.TopElem;
		filter = source.AddChild( 'filter' );
	}
	
	sourceDoc.Url = Url( 'xxx', 'xxx', '/', extQuery );

	for ( staticFilter in param.view.static_filters )
	{
		if ( staticFilter.cmp_pred != 'equal' )
			continue;

		if ( staticFilter.value_expr != '' )
			continue;

		elem = param.recordForm.EvalPath( staticFilter.id );

		if ( ! StrBegins( viewID, 'candidates_of_vacancy' ) )
		{
			valueElem = filter.AddChild( staticFilter.id, ( elem.IsMethod ? 'string' : elem.Type ) );
			//alert( staticFilter.value );
			valueElem.XmlValue = staticFilter.value;
		}
	}

	for ( dynFilter in param.view.dyn_filters )
	{
		if ( ! param.recordForm.ChildExists( dynFilter.id ) )
			continue;

		elem = param.recordForm.Child( dynFilter.id );

		if ( dynFilter.use_range_min )
		{
			valueElem = filter.AddChild( 'min_' + dynFilter.id, ( elem.IsMethod ? 'string' : elem.Type ) );
		}
		else if ( dynFilter.use_range )
		{
			valueElem = filter.AddChild( 'min_' + dynFilter.id, ( elem.IsMethod ? 'string' : elem.Type ) );
			valueElem = filter.AddChild( 'max_' + dynFilter.id, ( elem.IsMethod ? 'string' : elem.Type ) );
		}
		else
		{
			valueElem = filter.AddChild( dynFilter.id, ( elem.IsMethod ? 'string' : elem.Type ) );
		}
	}


	Response.Write( '<table' );
	Response.Write( ' class="SxTable"' );
	Response.Write( ' width="100%"' );
	Response.Write( ' border="0"' );
	Response.Write( ' cellspacing="0"' );
	Response.Write( '>\r\n' );

	Response.Write( '<colgroup>\r\n' );

	for ( field in param.view.fields )
	{
		Response.Write( '<col width_=10%/>\r\n' );
	}

	Response.Write( '</colgroup>\r\n' );

	Response.Write( '<tr>\r\n' );

	for ( field in param.view.fields )
	{
		Response.Write( '<td' );
		Response.Write( ' class="SxHeaderCell"' );

		align = lib_view.get_field_align( param, field );
		if ( align != '' )
			Response.Write( ' align="' + align + '"' );

		Response.Write( '>' );


		Response.Write( lib_view.get_field_col_title( param, field ), true );
		Response.Write( '</td>\r\n' );
	}

	Response.Write( '</tr>\r\n' );


	queryStr = 'for $elem in ' + param.catalogName;
	
	qual = lib_view.build_xquery_qual( param.view.id, source );
	if ( qual != '' )
	{
		queryStr += StrReplaceOne( qual, ' and ', ' where ' );
	}
		
	sortField = param.view.fields[0];
	orderStr = '';

	if ( param.objectForm.IsHier )
		orderStr += '$elem/Hier(), ';

	orderStr += '$elem/' + sortField.id;

	queryStr += ' order by ' + orderStr;
	queryStr += ' return $elem';

	if ( viewID == 'divisions_of_division' ) // !!!
		queryStr = 'for $elem in divisions where IsHierChildOrSelf( $elem/id, ' + ( extQueryObj.parent_id ? extQueryObj.parent_id : 'null()' ) + ' ) order by $elem/Hier(), $elem/name return $elem';

	//DebugMsg( queryStr );
	//SetClipboard( queryStr );

	array = XQuery( queryStr );

	for ( record in array )
	{
		if ( codeQual != undefined )
		{
			with ( record )
			{
				if ( ! eval( codeQual ) )
					continue;
			}
		}

		//DebugMsg( codeQual );
		Response.Write( '<tr>\r\n' );

		for ( field in param.view.fields )
		{
			if ( field.id != '' )
				elem = param.recordForm.EvalPath( field.id );
			else
				elem = undefined;

			if ( elem != undefined && elem.ForeignArrayExpr != '' )
				vocInfo = lib_voc.get_opt_voc_info( elem.ForeignArrayExpr );
			else
				vocInfo = undefined;

			if ( field.title_expr != '' )
			{
				with ( record )
				{
					title = eval( field.title_expr );
				}
			}
			else if ( elem != undefined )
			{
				if ( field.elem_expr != '' )
				{
					with ( source )
					{
						with ( record )
						{
							try
							{
								value = eval( field.elem_expr );
							}
							catch ( e )
							{
								//alert( filter.active_vacancy_id );
								alert( field.elem_expr );
								throw e;
							}

						}
					}
				}
				else
				{
					//value = record.EvalPath( field.id );

					with ( record )
					{
						try
						{
							value = eval( field.id );
						}
						catch ( e )
						{
							value = e;
						}
					}
				}

				title = value;

				if ( elem != undefined && elem.ForeignArrayExpr != '' && value != '' )
					title = value.ForeignDispName;
				
				if ( elem != undefined && elem.Type == 'bool' )
					title = value + ' ? \'+\' : \'\'';

				if ( field.use_time == false )
					title = StrDate( title, false );
				else if ( field.use_time == true )
					title = StrDate( title, true, false );
				else if ( field.time_only )
					title = StrTime( title, false );
			}
			else
			{
				throw 'title_expr or id required';
			}


			Response.Write( '<td' );
			Response.Write( ' class="SxCell"' );

			align = lib_view.get_field_align( param, field );
			if ( align != '' )
				Response.Write( ' align="' + align + '"' );

			textColor = '';

			if ( field.text_color_expr.HasValue )
			{
				with ( record )
				{
					textColor = eval( field.text_color_expr );
				}
			}
			else if ( field.text_color.HasValue )
			{
				textColor = field.text_color;
			}
			else if ( vocInfo != undefined && vocInfo.use_text_color && value != '' )
			{
				textColor = value.ForeignElem.text_color;
			}

			if ( textColor != '' )
				Response.Write( ' style="color:#' + StrHexColor( textColor )  + '"' );

			if ( isDlg )
			{
				action = 'window.dialogArguments.object_id = \'' + record.id + '\'; window.dialogArguments.object_primary_disp_name = ' + CodeLiteral( record.ExternalDispName ) + '; window.close()';
			}
			else
			{
				href = build_outer_link( outerEnv, ( param.objectName == 'rr_poll' ? 'event' : param.objectName ) + '.htm', { id : ('0x' + StrHexInt( record.id, 16 )) } );
				action = 'window.location.href=\'' + href + '\'';
			}

			Response.Write( ' onclick="' + XmlAttrEncode( action ) + '"' );

			Response.Write( '>' );


			if ( param.objectForm.IsHier && field.ChildIndex == 0 )
				Response.Write( ArrayMerge( PlainSeq( record.hlevel ), '\' &nbsp;\'' ) );

			Response.Write( title, true );
			Response.Write( '</td>' );
		}

		Response.Write( '</tr>\r\n' );
	}

	Response.Write( '</table>\r\n' );
}




function build_web_card( Response, objectData, fieldNames, outerEnv )
{
	Response.Write( '<table' );
	Response.Write( ' class="SxCardTable"' );
	Response.Write( ' border="0"' );
	Response.Write( '>\r\n' );

	Response.Write( '<colgroup>\r\n' );
	Response.Write( '<col/>\r\n' );
	Response.Write( '<col/>\r\n' );
	Response.Write( '</colgroup>\r\n' );

	build_web_card_elems( Response, objectData, fieldNames, outerEnv );

	Response.Write( '</table>\r\n' );
}


function build_web_card_elems( Response, objectData, fieldNames, outerEnv )
{
	for ( fieldName in fieldNames )
	{
		elem = objectData.EvalPath( fieldName );
		//if ( ! elem.HasValue )
			//continue;

		formElem = elem.FormElem;

		Response.Write( '<tr>\r\n' );

		Response.Write( '<td' );
		Response.Write( ' class="SxNameCell"' );
		Response.Write( '>\r\n' );

		Response.Write( formElem.Title + ':', true );

		Response.Write( '</td>\r\n' );


		Response.Write( '<td' );
		Response.Write( ' class="SxValueCell"' );
		Response.Write( '>\r\n' );

		
		if ( formElem.ForeignArrayExpr != '' )
			value = elem.ForeignDispName;
		else if ( formElem.Type == 'bool' )
			value = ( elem ? 'Да' : '-' );
		else if ( formElem.Type == 'date' && elem != null && Hour( elem ) != undefined )
			value = StrDate( elem, true, false );
		else
			value = elem;

		href = '';

		if ( formElem.ForeignArrayExpr != '' && ArrayOptFindByKey( card_object_types, objectName = lib_base.catalog_name_to_object_name( formElem.ForeignArrayExpr ) ) != undefined && ( objectName == 'vacancy' || objectName == 'candidate' ) )
			href = build_outer_link( outerEnv, objectName + '.htm', { id : ('0x' + StrHexInt( elem, 16 )) } );

		if ( href != '' )
			Response.Write( '<a href="' + href + '">' );

		Response.Write( value, true );

		if ( href != '' )
			Response.Write( '</a>' );

		Response.Write( '</td>\r\n' );
		Response.Write( '</tr>\r\n' );
	}
}


function build_web_card_attachments( Response, objectData, outerEnv )
{
	//array = objectData.sorted_attachments;
	array = ArraySort( objectData.attachments, 'is_text', '+', 'type_id.HasValue', '-', 'type_id.ForeignElem.order_index', '+', 'date', '-', 'name', '+' );

	for ( attachment in array )
		build_web_card_attachment( Response, objectData, attachment, outerEnv );
}


function build_web_card_attachment( Response, objectData, attachment, outerEnv )
{
	if ( attachment.is_binary )
	{
		href = build_direct_outer_link( outerEnv, 'card_attachment.htm', {object_name:objectData.Name,object_id:objectData.id,attc_id:attachment.id,attc_file_name:attachment.file_name} );

		Response.Write( '<br/>' );
		Response.Write( '<p><b>' );

		Response.Write( '<a href="' + href + '">' );
		Response.Write( attachment.name_desc, true );
		Response.Write( '</a>' );

		Response.Write( '</b></p>' );
		Response.Write( '<br/>' );
		return;
	}

	Response.Write( '<h3>' );
	Response.Write( attachment.name_desc, true );
	Response.Write( '</h3>' );

	if ( attachment.is_text )
	{
		Response.Write( build_web_html( attachment.text, objectData, attachment, outerEnv ) );
	}
	else if ( attachment.is_plain_text )
	{
		Response.Write( attachment.plain_text, true );
	}
}



function build_web_form_edit( Response, webFormUrl, filter )
{
	webForm = OpenDoc( webFormUrl ).TopElem;
	form = DefaultDb.GetObjectForm( webForm.object_type_id );

	Response.Write( '<table' );
	Response.Write( ' class="SxCardTable"' );
	Response.Write( ' border="0"' );
	Response.Write( ' width="100%"' );
	Response.Write( '>\r\n' );

	Response.Write( '<colgroup>\r\n' );
	Response.Write( '<col width_="30%"/>\r\n' );
	Response.Write( '<col width_="70%"/>\r\n' );
	Response.Write( '</colgroup>\r\n' );

	for ( field in webForm.fields )
	{
		formElem = undefined;

		if ( field.id.HasValue )
		{
			if ( ! form.TopElem.PathExists( field.id ) )
				throw 'Invalid path: ' + field.id;

			formElem = form.TopElem.EvalPath( field.id );
		}

		if ( field.web_id.HasValue )
			fieldID = field.web_id;
		else
			fieldID = StrReplace( field.id, '.', '__' );

		if ( field.title.HasValue )
			title = field.title;
		else if ( formElem != undefined )
			title = formElem.Title;
		else
			title = '';

		if ( filter != undefined )
		{
			fieldVal = filter.GetOptProperty( fieldID );
			//if ( fieldVal == undefined )
				//DebugMsg( fieldID );
		}
		else
		{
			fieldVal = undefined;
		}

		if ( formElem != undefined && formElem.ForeignArrayExpr != '' )
			vocInfo = lib_voc.get_opt_voc_info( formElem.ForeignArrayExpr );
		else
			vocInfo = undefined;

		isMultiline = field.is_multiline;


		Response.Write( '<tr>\r\n' );

		Response.Write( '<td' );
		Response.Write( ' class="SxNameCell"' );
		Response.Write( '>\r\n' );
		
		if ( formElem == undefined || formElem.Type != 'bool' )
			Response.Write( title + ':', true );
		
		Response.Write( '</td>\r\n' );


		Response.Write( '<td' );
		Response.Write( ' class="SxValueCell"' );
		Response.Write( '>\r\n' );

		if ( isMultiline )
		{
			Response.Write( '<textarea' );

			Response.Write( ' id="' + fieldID + '"' );
			Response.Write( ' name="' + fieldID + '"' );

			Response.Write( ' cols="90"' );
			Response.Write( ' rows="6"' );

			//Response.Write( ' style="width:100%"' );
			Response.Write( '>' );

			if ( fieldVal != undefined )
				Response.Write( fieldVal );

			Response.Write( '</textarea>\r\n' );
		}
		else if ( field.use_selector )
		{
			Response.Write( '<input' );
			Response.Write( ' id="' + StrReplace( fieldID, '_id', '_name' ) + '"' );
			Response.Write( ' readonly="1"' );
			Response.Write( ' onclick="SxSelectForeignObject( \'' + 'division_id' + '\', \'' + 'divisions_of_division' + '\', {parent_id:\'' + filter.division_id + '\'} )"' );
			Response.Write( ' style="width:80%"' );
			Response.Write( ' value="' + GetForeignElem( divisions, filter.division_id ).ExternalDispName + '"' );

			Response.Write( '/>\r\n' );

			Response.Write( '<input' );
			Response.Write( ' id="' + fieldID + '"' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( ' type="hidden"' );
			Response.Write( ' value="' + filter.division_id + '"' );
			Response.Write( '/>\r\n' );

			Response.Write( '<a' );
			Response.Write( ' href="#"' );
			Response.Write( ' onclick="SxSelectForeignObject( \'' + 'division_id' + '\', \'' + 'divisions_of_division' + '\', {parent_id:\'' + filter.division_id + '\'} )"' );
			Response.Write( '>' );

			Response.Write( 'Выбрать' );
			Response.Write( '</a>\r\n' );
		}
		else if ( field.use_outer_selector )
		{
			Response.Write( '<input' );
			Response.Write( ' id="' + StrReplace( fieldID, '_eid', '_name' ) + '"' );
			Response.Write( ' readonly="1"' );
			Response.Write( ' onclick="SxSelectOuterObject( \'' + 'collaborators' + '\' )"' );
			Response.Write( ' style="width:80%"' );

			Response.Write( '/>\r\n' );

			Response.Write( '<input' );
			Response.Write( ' id="' + fieldID + '"' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( ' type="hidden"' );
			Response.Write( '/>\r\n' );

			Response.Write( '<a' );
			Response.Write( ' href="#"' );
			Response.Write( ' onclick="SxSelectOuterObject( \'' + 'collaborators' + '\' )"' );
			Response.Write( '>' );

			Response.Write( 'Выбрать' );
			Response.Write( '</a>\r\n' );
		}
		else if ( vocInfo != undefined )
		{
			Response.Write( '<select' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( '>\r\n' );

			Response.Write( '<option' );
			Response.Write( ' value=""' );
			Response.Write( '>\r\n' );
			Response.Write( '</option>' );

			voc = eval( vocInfo.id );

			for ( vocElem in lib_voc.get_sorted_voc( voc ) )
			{
				Response.Write( '<option' );
				Response.Write( ' value="' + vocElem.id + '"' );

				if ( fieldVal != undefined && vocElem.id == fieldVal )
					Response.Write( ' selected="1"' );

				Response.Write( '>\r\n' );

				Response.Write( vocElem.name, true );

				Response.Write( '</option>' );
			}

			Response.Write( '</select>' );
		}
		else if ( formElem != undefined && formElem.ForeignArrayExpr != '' && StrContains( formElem.ForeignArrayExpr, '.' ) )
		{
			Response.Write( '<select' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( '>\r\n' );

			Response.Write( '<option' );
			Response.Write( ' value=""' );
			Response.Write( '>\r\n' );
			Response.Write( '</option>' );

			array = eval( formElem.ForeignArrayExpr );
			//alert( fieldVal );

			for ( vocElem in array )
			{
				Response.Write( '<option' );
				Response.Write( ' value="' + vocElem.id + '"' );

				if ( fieldVal != undefined && vocElem.id == fieldVal )
					Response.Write( ' selected' );

				Response.Write( '>\r\n' );

				Response.Write( vocElem.name, true );

				Response.Write( '</option>' );
			}

			Response.Write( '</select>' );
		}
		else if ( field.value_entries.ChildNum != 0 && ! field.is_multi_value )
		{
			Response.Write( '<select' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( '>\r\n' );

			Response.Write( '<option' );
			Response.Write( ' value=""' );
			Response.Write( '>\r\n' );
			Response.Write( '</option>' );

			for ( entry in field.value_entries )
			{
				Response.Write( '<option' );
				Response.Write( ' value="' + entry.id + '"' );

				if ( fieldVal != undefined && entry.id == fieldVal )
					Response.Write( ' selected="selected"' );

				Response.Write( '>\r\n' );

				Response.Write( ( entry.value.HasValue ? entry.value : entry.id ), true );

				Response.Write( '</option>' );
			}

			Response.Write( '</select>' );
		}
		else if ( field.value_entries.ChildNum != 0 && field.is_multi_value )
		{
			//if ( fieldID == 'personal_attr_desc' )
				//DebugMsg( ArrayMerge( fieldVal, 'This', ',' ) );

			for ( entry in field.value_entries )
			{
				Response.Write( '<input' );
				Response.Write( ' type="checkbox"' );
				Response.Write( ' name="' + fieldID + '__' + ( entry.id.HasValue ? entry.id : entry.ChildIndex ) + '"' );
				
				if ( fieldVal != undefined )
				{
					//DebugMsg( fieldID );
					//DebugMsg( ArrayMerge( fieldVal, 'This', ',' ) );
				}

				if ( fieldVal != undefined && ( ArrayOptFind( fieldVal, 'This == entry.id' ) != undefined || ArrayOptFind( fieldVal, 'This == entry.value' ) != undefined ) )
					Response.Write( ' checked' );

				Response.Write( '/>\r\n' );

				Response.Write( ( entry.value.HasValue ? entry.value : entry.id ), true );
				Response.Write( '&nbsp; ' );
			}
		}
		else if ( formElem != undefined && formElem.Type == 'bool' )
		{
			Response.Write( '<input' );
			Response.Write( ' type="checkbox"' );
			Response.Write( ' name="' + fieldID + '"' );
			Response.Write( '/>\r\n' );

			Response.Write( title, true );
		}
		else
		{
			Response.Write( '<input' );
			Response.Write( ' id="' + fieldID + '"' );
			Response.Write( ' name="' + fieldID + '"' );

			if ( formElem != undefined && formElem.Type == 'integer' )
				Response.Write( ' size="10"' );
			else if ( field.suffix_title.HasValue )
				Response.Write( ' size="10"' );
			else
				Response.Write( ' style="width:100%"' );

			if ( fieldVal != undefined )
				Response.Write( ' value="' + fieldVal + '"' );

			Response.Write( '/>\r\n' );
		}

	
		Response.Write( field.suffix_title, true );

		Response.Write( '</td>\r\n' );

		Response.Write( '</tr>\r\n' );
	}

	Response.Write( '</table>\r\n' );
}



function build_web_poll_result_edit( Response, objectData, pollResult, showAllResults )
{
	spec = pollResult.spec_id.ForeignElem;

	if ( showAllResults )
	{
		showPrevResults = true;
		prevResultsNum = pollResult.Parent.ChildNum;
	}
	else
	{
		showPrevResults = objectData.type.use_participants_order;
		if ( showPrevResults )
		{
			if ( objectData.type_id == 'rr_poll_co' || pollResult.person_id == objectData.resp_person_id )
				prevResultsNum = pollResult.Parent.ChildNum;
			else
				prevResultsNum = pollResult.ChildIndex;
		}
		else
		{
			prevResultsNum = 0;
		}
	}

	Response.Write( '<table' );
	Response.Write( ' class="SxCardTable"' );
	Response.Write( ' border="0"' );
	Response.Write( ' width="100%"' );
	Response.Write( '>\r\n' );

	Response.Write( '<colgroup>\r\n' );
	
	if ( showPrevResults )
	{
		Response.Write( '<col width="30%"/>\r\n' );
		Response.Write( '<col width="' + ( 70 - prevResultsNum * 10 ) + '%"/>\r\n' );

		for ( i = 0; i < prevResultsNum; i++ )
			Response.Write( '<col width="10%"/>\r\n' );
	}
	else
	{
		Response.Write( '<col width="30%"/>\r\n' );
		Response.Write( '<col width="70%"/>\r\n' );
	}

	Response.Write( '</colgroup>\r\n' );

	if ( showPrevResults )
	{
		Response.Write( '<tr>\r\n' );

		Response.Write( '<td' );
		Response.Write( '>\r\n' );
		Response.Write( '</td>\r\n' );

		Response.Write( '<td' );
		Response.Write( '>\r\n' );
		Response.Write( '</td>\r\n' );

		for ( i = 0; i < prevResultsNum; i++ )
		{
			ppResult = objectData.participant_poll_results[i];

			Response.Write( '<td' );
			Response.Write( '>\r\n' );

			Response.Write( ppResult.person_id.ForeignDispName );

			Response.Write( '</td>\r\n' );
		}

		Response.Write( '</tr>\r\n' );
	}

	for ( question in spec.build_questions_array( objectData ) )
	{
		Response.Write( '<tr>\r\n' );

		Response.Write( '<td' );
		Response.Write( ' class="SxNameCell"' );
		Response.Write( ' style="vertical-align:top"' );
		Response.Write( '>\r\n' );

		if ( question.name.HasValue )
		{
			Response.Write( question.name, true );
			if ( ! question.is_separator )
				Response.Write( ':' );
		}

		Response.Write( '</td>\r\n' );


		Response.Write( '<td' );
		//Response.Write( ' class="SxValueCell"' );
		Response.Write( '>\r\n' );

		if ( ! question.is_separator )
		{
			questionAnswer = pollResult.question_answers.GetOptChildByKey( question.id );

			if ( question.use_score )
			{
				for ( i = question.min_score; i <= question.max_score; i++ )
				{
					Response.Write( '<input' );
					Response.Write( ' type="radio"' );
					Response.Write( ' name="' + question.id + '"' );
					Response.Write( ' value="' + i + '"' );
					
					if ( questionAnswer != undefined && questionAnswer.answer_id.ByValueExists( i ) )
						Response.Write( ' checked="1"' );
					
					if ( question.auto_update_form )
						Response.Write( ' onclick="SxUpdateFormData( this )"' );

					Response.Write( '/> ' );

					Response.Write( i, true );
					Response.Write( ' ' );
				}
			}
			else if ( question.answers.ChildNum != 0 )
			{
				for ( answer in question.answers )
				{
					Response.Write( '<input' );
					
					if ( question.is_multi_answer )
						Response.Write( ' type="checkbox"' );
					else
						Response.Write( ' type="radio"' );
					
					nodeID = question.id + '__' + answer.id;

					Response.Write( ' id="' + nodeID + '"' );
					Response.Write( ' name="' + question.id + '"' );
					Response.Write( ' value="' + answer.id + '"' );
					
					if ( questionAnswer != undefined && questionAnswer.answer_id.ByValueExists( answer.id ) )
						Response.Write( ' checked="1"' );
					
					if ( spec.id == 'rgs_poll_6' && question.id == 'q_decision' )
					{
						nodeName = question.id + '__comment';
						Response.Write( ' onchange="if (this.value ) { document.getElementsByName( ' + CodeLiteral( nodeName ) + ' )[0].disabled = ' + CodeLiteral( answer.id != 3 ) + ';}"' );
					}

					Response.Write( '> ' );
					
					Response.Write( '<label' );
					Response.Write( ' for="' + nodeID + '"' );
					Response.Write( '> ' );

					Response.Write( answer.name, true );

					Response.Write( '</label>' );
					Response.Write( '</input>' );
				}
			}
			else if ( question.type != 'undefined' )
			{
				Response.Write( '<input' );
				Response.Write( ' type="edit"' );
				Response.Write( ' name="' + question.id + '"' );

				if ( question.expr.HasValue )
				{
					Response.Write( ' disabled="1"' );

					if ( questionAnswer != undefined && questionAnswer.score.HasValue )
						Response.Write( ' value="' + questionAnswer.score + '"', true );
				}
				else
				{
					if ( questionAnswer != undefined && questionAnswer.answer_id.HasValue )
						Response.Write( ' value="' + questionAnswer.answer_id.Instances[0] + '"', true );
				}

				Response.Write( ' style="width:40px"' );
				
				Response.Write( '/> ' );
			}

			Response.Write( '\r\n' );
		}
		
		if ( question.use_comment )
		{
			if ( question.type != 'undefined' )
				//Response.Write( ' &nbsp; &nbsp; ' );
				Response.Write( '<br/>' );

			Response.Write( '<textarea' );
			Response.Write( ' name="' + question.id + '__comment"' );
			Response.Write( ' style="width:100%"' );
			Response.Write( ' rows="3"' );
			//Response.Write( ' placeholder="Comment"' );
			
			if ( spec.id == 'rgs_poll_6' && question.id == 'q_decision' )
				Response.Write( ' disabled="1"' );

			Response.Write( '>' );

			if ( questionAnswer != undefined )
				Response.Write( HtmlEncode(  questionAnswer.comment ) );

			Response.Write( '</textarea> ' );
		}

		Response.Write( '</td>\r\n' );

		for ( i = 0; i < prevResultsNum; i++ )
		{
			ppResult = objectData.participant_poll_results[i];
			questionAnswer = ppResult.question_answers.GetOptChildByKey( question.id );

			Response.Write( '<td style="text-align:center"' );
			Response.Write( '>\r\n' );

			if ( questionAnswer != undefined )
			{
				if ( question.expr.HasValue )
				{
					Response.Write( questionAnswer.score );
				}
				else if ( question.answers.ChildNum != 0 )
				{
					count = 0;

					for ( answer in question.answers )
					{
						if ( questionAnswer.answer_id.ByValueExists( answer.id ) )
						{
							if ( count != 0 )
								Response.Write( ', ' );

							Response.Write( answer.name );
							count++;
						}
					}
				}
				else
				{
					Response.Write( ArrayMerge( questionAnswer.answer_id, 'This', ',' ) );
				}

				if ( question.use_comment && questionAnswer.comment.HasValue )
					Response.Write( '; ' + questionAnswer.comment );
			}

			Response.Write( '</td>\r\n' );
		}

		Response.Write( '</tr>\r\n' );
	}

	Response.Write( '</table>\r\n' );
}


function build_outer_link( outerEnv, path, query )
{
	if ( outerEnv == undefined )
		return path + ( query != undefined ? '?' + UrlEncodeQuery( query ) : '' );

	link = outerEnv.outerUrl;
	if ( StrContains( link, '?' ) )
		link += '&';
	else
		link += '?';

	if ( ! StrContains( path, '/' ) && ( baseUrlPath = outerEnv.GetOptProperty( 'baseUrlPath' ) ) != undefined )
	{
		if ( ! StrBegins( path, '/' ) && ! StrBegins( baseUrlPath, '/' ) )
			baseUrlPath += '/';

		path = baseUrlPath + path;
	}

	link += 'inner_url_path=' + path;

	if ( query != undefined )
	{
		for ( propName in query )
			link += '&inner_' + propName + '=' + UrlEncode( query.GetProperty( propName ) );
	}

	return link;
}


function build_direct_outer_link( outerEnv, path, query )
{
	if ( ( urlStr = AppConfig.GetOptProperty( 'web-direct-outer-url' ) ) != undefined )
	{
		link = AbsoluteUrl( urlStr, outerEnv.outerUrl );
		if ( StrContains( link, '?' ) )
			link += '&';
		else
			link += '?';

		link += 'inner_url_path=' + path;

		if ( query != undefined )
		{
			for ( propName in query )
				link += '&inner_' + propName + '=' + UrlEncode( query.GetProperty( propName ) );
		}

		return alert(link);
	}

	return StrReplaceOne( build_outer_link( outerEnv, path, query ), '/view_doc.html', '/estaff_direct.html' );
}


function build_outer_url( path, query )
{
	link = global_settings.web.outer_url;
	
	if ( UrlParam( global_settings.web.outer_url ) == '' )
	{
		link += path;

		if ( query != undefined )
		{
			count = 0;

			for ( propName in query )
			{
				if ( count == 0 )
					link += '?';
				else
					link += '&';

				link += propName + '=' + UrlEncode( query.GetProperty( propName ) );
				count++;
			}
		}
	}
	else
	{
		link += '&inner_url_path=' + path;

		if ( query != undefined )
		{
			for ( propName in query )
				link += '&inner_' + propName + '=' + UrlEncode( query.GetProperty( propName ) );
		}
	}

	return link;
}


function build_web_html( htmlStr, objectData, attachment, outerEnv )
{
	//PutUrlData( 'zzzz.htm', htmlStr );

	if ( StrContains( htmlStr, 'utf-8', true ) )
		htmlStr = DecodeCharset( htmlStr, 'utf-8' );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );
	insideBody = ! lib_html.is_full_html( htmlStr );

	while ( reader.ReadNext() )
	{
		if ( insideBody )
		{
			if ( reader.TagName == '/body' )
				break;

			if ( reader.TagName == 'img' || reader.TagName == 'v:imagedata' )
			{
				adjust_web_image_tag( reader, objectData, attachment, outerEnv );
			}
		}
		else
		{
			if ( reader.TagName == 'body' )
				insideBody = true;

			continue;
		}
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function adjust_web_image_tag( reader, objectData, attachment, outerEnv )
{
	urlStr = reader.GetAttr( 'src' );
	if ( urlStr == '' )
		return;

	if ( StrBegins( urlStr, '/' ) || StrBegins( urlStr, 'http:', true ) || StrContains( urlStr, ':' ) )
		return;

	//if ( urlStr.Contains( '?' ) || urlStr.EndsWith( ".htm" ) || urlStr.EndsWith( ".html" ) )
		//return noError;

	if ( StrBegins( urlStr, './' ) )
		urlStr = StrRightRangePos( urlStr, 2 );

	query = new Object;
	query.object_name = objectData.Name;
	query.object_id = objectData.id;
	query.attc_id = attachment.id;
	query.res_id = urlStr;
	
	newUrl = build_direct_outer_link( outerEnv, 'card_attachment_res.htm', query );
	reader.SetAttr( 'src', newUrl );
}


function MaskCodesStr( str )
{
	return StrReplace( str, '"', '\\"' );
}
