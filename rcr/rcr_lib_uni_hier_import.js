// ������������� ����������� ������������� �������� �� ������ ���� *.xls, *.csv
// ������ ��� ���������� � ����� ������ ���� �����������, ��������, � ���������� �������:
// ----------������� 1 ---------- �������2 ----------- �������3---------------
// ������1 	�������1.��������1	�������2.��������21	�������3.��������31
// ������2   										�������3.��������32
// ������3	�������1.��������2  �������2.��������22
// ������4						�������2.��������23
// ----------------------------------------------------------------------------
// ���������� �� ����� ����������� � ���������� ������������� (professions).

// ��������� ������� �� ����������� �������������� ��� ����������� �������� (� �������: <is_std>1</is_std>)

// ���� � ����������� ��������� (� �������: <is_std>1</is_std>) ���� ���������������� �������� ��������, �� 
// ���������������� �������� �����������, �� ����������� �� ��������� ����������  �������� �����.

// ���� �������� ��� ������������� � ���� �������������� �������� ��������� � ��������� ������������, ��:
// ������� �� ��������� ����� �������, ������������� �������� ��������.

// ��������� (�����) ����������� ������������:
// ����� ���� � ������������� ���������� ����� ��������� (����� �����).



function uni_hier_import()
{
	cL = new Array(); //������ �� EXCEL-�����
	aL = new Array(); //������� �������� �� ����������� ��������� 
	row_length = 0; // ������ ������ �� EXCEL-�����
	small_array = new Array(); //�������� ������ ��������� ��� �������� ��������� � ����
	elemID = 1; //id ��� ������ ��������
	is_in_base = false; //����� ��������� � ������ ���� �� ����������
	is_parent_open = false; //������������ ������� ��� ����� ������������ �������� ��� �� ������
	coincidence = 0; //���������� ���������� ����� ������� ������� �� EXCEL-����� � �������� ��������� �� ����
	row_current_number = 0; //���������� �������� ����� � ������ �� EXCEL-�����
	deleted_array = new Array(); // ������ ��������� ����������� ���������
	
	//�������� �����=========================== 
	LogEvent('', '������ ��������');
	file_url = ActiveScreen.AskFileOpen();
	if ( file_url == '' ) //��������� ������� url  ����� ��� ��������
		throw UserError( UiText.errors.unable_to_open_file );
	LogEvent('', '�������� �� ������� ����� ��� ������� - ��������. file_url = ' + file_url);
	
	srcDoc = OpenDoc( file_url, 'format=excel' );
	LogEvent('', '���� ��� ������� ������');
	//�������� ��������� ��������� =========================================
	query = 'for $elem in professions where $elem/id != null()';
	query += ' return $elem';
	array = XQuery(query);
	LogEvent( '', query );
	array = ArraySort( array, 'name', '+'); //������ ���������
	LogEvent('', '������ ��������� �������� �� ���� ������ E-Staff - ��������������');
	//==========================================
	
	
	for (profession in array) //====�������� ��������� <is_std>1</is_std>
	{
		//profession_for_delete = OpenDoc(ObjectDocUrl('data','profession', profession.id)).TopElem;
		profession_for_delete_url = ObjectDocUrl('data','profession', profession.id);
		if (profession.is_std == true)
		{
			deleted_array.push(profession);
			DeleteDoc(profession_for_delete_url);
		}
	}
	
	for (profession in array)
	{
		if (profession.parent_id.HasValue == true)
		{
			for (deleted_profession in deleted_array)
			{
				if ((profession.parent_id == deleted_profession.id)&&(profession.is_std == false))
				{
				//	profDoc_for_delete_parent = OpenDoc(ObjectDocUrl('data','profession', profession.id)).TopElem;
					profDoc_for_delete_parent = DefaultDb.OpenObjectDoc( 'profession', profession.id );
					profDoc_for_delete_parent.TopElem.parent_id = '';
					profDoc_for_delete_parent.Save();
				}
			}
		}
	}
	//�������� ��������� ��������� =========================================
	query = 'for $elem in professions where $elem/id != null()';
	query += ' return $elem';
	array = XQuery(query);
	LogEvent( '', query );
	array = ArraySort( array, 'name', '+'); //������ ���������
	LogEvent('', '������ ��������� �������� �� ���� ������ E-Staff - ��������');
	//==========================================
	
	//���������� ��� ������ � �������� EXCEL-�����, ��������� ������������ ������ ������
	for ( row in srcDoc.TopElem[0] )  { if (row_length < ArrayCount(row)) { row_length = ArrayCount(row); } }
	LogEvent('', '������� ������ EXCEL ������������ ������, ������ ' + row_length);
	
	for ( i = 0; i<=(row_length-1); i++)  { cL[i]=''; aL[i]=0; }//�������� �������� ��������
	for ( row in srcDoc.TopElem[0] ) //�������� ��������� ������� ������ ���������: ���������� ��� ������ � �������� EXCEL-�����================
	{
		row_current_number = 0;
		for ( i = 0; i<=(row_length-1); i++) //��������� �������� ������ �� ��������� ������ EXCEL-�����
		{
			if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
			if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
			if  (row[i] != '') {row_current_number++;}
		}
		
		if ((row_current_number>0)&&(cL[0] != '')&&(row[0] != '' )) //���� ������� ������ EXCEL-����� �� ������
		{	
			is_in_base = false;
			for ( profession in array ) //������� ������ ���������, ����������� �� ���� ������ E-Staff
			{
			//	if (profession.id >= elemID) { elemID = profession.id + 1; }//����� ���������� id	
				if (( profession.parent_id.HasValue == false)&&(profession.name == cL[0])) { is_in_base = true; }
			} 
		
			if (is_in_base == false) //���� ��������� �� ������ EXCEL-����� � ���� �� ������� - ������� ��������� ������� ������ ��������
			{
				elemID = lib_voc.obtain_next_voc_elem_id( professions );
				subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
			//	elemID = elemID + 1;
				subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
				subDoc.TopElem.name =  row[0];
				small_array.push(subDoc.TopElem); //�������� ��������� � ��������� ������
				subDoc.Save();
			}
		}	
	}// ��� ������ � �������� EXCEL-����� ���������
	
	for (new_profession in small_array) { LogEvent('', '����� ������������� 1 ������: ' + new_profession.name); }
	if (small_array.length > 0)
	{
		array = ArrayUnion(array, small_array); //���������� �������
		salo = small_array.length;
		small_array.splice( 0, salo ); //������� ��������� ������
		LogEvent('', '�������� 1 ����. ���������� ����������� �������������� 1 ������: ' + salo);
	}
	else
	{
		LogEvent('', '�������� 1 ����. ���������� ����������� �������������� 1 ������: 0 ');
	}
	LogEvent('', '������ ������� (small_array.length) ����� �������: ' + small_array.length);
	//===============================================================================================================================
	
	for ( w = 1; w<=(row_length-1); w++) // w - ����� ������� � EXCEL-�����(��������� ���������� � ����).=====================================
	{									 // �������� ��������� ��������� (����� �������) ������� ��������
		w1 = w + 1;
		LogEvent('', '������ ����  w = ' + w);
		for ( i = 0; i<=(row_length-1); i++)  { cL[i]=''; aL[i]=0; }//�������� �������� ��������
		//LogEvent('', '������� ��������� �������� cL[i] � aL[i]');
		for ( row in srcDoc.TopElem[0] ) //���������� ��� ������ � �������� excel========================================================
		{
			//LogEvent('', '��������� ������ cL[0]..cL[' + (row_length-1) + ']');
			row_current_number = 0;
			for ( i = 0; i<=(row_length-1); i++) //��������� ������� ������
			{
				if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
				if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
				if  (row[i] != '') {row_current_number++;}
				//LogEvent('', 'cL[' + i + ']= '+ cL[i]);
			}
			if ((row_current_number>0)&&(cL[w] != '')&&(row[w] != '' )) //���� ������� ������ EXCEL-����� �� ������ � ��������������� ������� ������ �� ������
			{	
			//	LogEvent('', ' ������� ������ cL[0] = ' + cL[0] + ' cL[1] = ' + cL[1]);
				
				is_in_base = false;
				is_parent_open = false;
				
			//	if (cL[w] !='')
			//	{	
					for ( profession in array ) //������� ������ ���������, ����������� �� ���� ������ E-Staff
					{
					//	if (profession.id >= elemID) { elemID = profession.id + 1; }//����� ���������� id
						
						
						//LogEvent('', '����� ������� (w + 1) = ' + w1 );				
						//LogEvent('', '������ ������� aL[w], aL[w-1]...aL[0] �� ������� ��������� � �����������, �� �� ����, � ����� ���� ������ ������� w+1');
						for (x = w; x>=0; x = x - 1) 	//������ ������� aL[w], aL[w-1]...aL[0] �� ������� ��������� � �����������, �� �� ����, � ����� ���� ������ ������� w+1
						{						//�.�. ����� �� ������, ��� ����������� ����� ������ EXCEL-�����	
							if (x == w) {aL[x] = profession;}
							
							if (x < w)
							{
								if (aL[x+1] != 0)
								{
									if (aL[x+1].parent_id.HasValue == true)
									{
									//	alert ('!!!!!!!!!!!!!!!!!!!!!!');
									//	LogEvent('', 'aL[x+1].id = ' + aL[x+1].id + ' aL[x+1].parent_id = ' + aL[x+1].parent_id);
										aL[x] = OpenDoc(ObjectDocUrl('data','profession', aL[x+1].parent_id)).TopElem;
									}
									else
									{
										aL[x] = 0;
									}
								}
								else
								{
									aL[x] = 0;
								}
							}
							//LogEvent('', 'aL[' + x + ']= ' + aL[x]); //  0,  1
						} //======��������� ������� �� ������� ��������� � �����������=================================
						
					/*	if ((aL[0] != 0)&&(aL[1] != 0))
						{
						//	LogEvent('', ' ������� ������� aL[0] = ' + aL[0].name + ' aL[1] = ' + aL[1].name );
						}
						
						if ((aL[0] != 0)&&(aL[1] == 0))
						{
						//	LogEvent('', ' ������� ������� aL[0] = ' + aL[0].name + ' aL[1] = ' + aL[1]);	
						}
						
						if ((aL[0] == 0)&&(aL[1] != 0))
						{
						//	LogEvent('', ' ������� ������� aL[0] = ' + aL[0] + ' aL[1] = ' + aL[1].name);	
						}
						
						if ((aL[0] == 0)&&(aL[1] == 0))
						{
						//	LogEvent('', ' ������� ������� aL[0] = ' + aL[0] + ' aL[1] = ' + aL[1]);	
						} */
						
						//LogEvent('', '���������� ������� �� ������� ��������� � ����������� � ������� �������');
						coincidence_all = 0;//=============================================================================
						coincidence_short = 0;
						for (y = w; y>=0; y= (y - 1)) //���������� ������� �� ������� ��������� � ����������� � ������� ������� 
						{
						//	LogEvent('', 'aL[' + y + ']= ' + aL[y]);
							
							if (aL[y] != 0) 
							{ 
								//LogEvent('', 'y = ' + y + ' aL[y].name = ' + aL[y].name + ' cL[y] = ' + cL[y] );
								if (aL[y].name == cL[y]) {coincidence_all++;} 
							}
							
							if ((aL[y] !=0) && (y>0))
							{
								if (aL[y].name == cL[y-1]) {coincidence_short++;}
							}
						}
					//	LogEvent('', 'coincidence_all = ' + coincidence_all +  'coincidence_short = ' + coincidence_short);

						
						if (coincidence_all == (w+1) ) //���� ������� ���
						{
					//		LogEvent('', ' ��-�� - 1 !!!!!!!!!!!!!!!!!!! ');
							if (aL[0].parent_id.HasValue == false) //� ������ ����� ������� - ��� ������� ������� (��� ��������)
							{
								is_in_base = true; //����� - ����� ����� ��������� ��� ���� � �������
							}
						}
						
						if (coincidence_short == w ) //���� ������ ���, ����� ������ - ������ �������� (aL[0])
						{
					//		LogEvent('', ' ��-�� - 2 !!!!!!!!!!!!!!!!!!! ');
							if (aL[1].parent_id.HasValue == false)
							{
								parent = aL[w];
								is_parent_open = true;
							}
						}//=======================================================================================================
					} // ������ ������ ��������� �� ���� ������ ==========================
					
					if ((is_in_base == false)&&(is_parent_open == true)) //���������� ���������� ������� ��������� 
					{
						elemID = lib_voc.obtain_next_voc_elem_id( professions );
						subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
					//	elemID = elemID + 1;
						subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
						subDoc.TopElem.name =  row[w];
						subDoc.TopElem.parent_id = parent.id
						small_array.push(subDoc.TopElem); //�������� ��������� � ��������� ������
						subDoc.Save();
					}		
			//	}	
			}	//�.�. ���� ������ ������ EXCEL-����� �� ������
		} //��������� ��� ������ � �������� EXCEL-����� =================
		
		for ( new_profession in small_array )
		{
			LogEvent('', '����� ������������� ' + w1 + ' ������: ' + new_profession.name);
		}
		
		if ( small_array.length > 0 )
		{
			array = ArrayUnion( array, small_array ); //���������� �������
			salo = small_array.length;
			small_array.splice( 0, salo ); //������� ��������� ������
			LogEvent('', '�������� ' + w1 + ' ����. ���������� ����������� ��������������' + w1 + '������: ' + salo);
		}
		else
		{
			LogEvent('', '�������� ' + w1 + ' ����. ���������� ����������� �������������� ' + w1 + '������: 0');
		}
		//LogEvent('','!!!!!!!!!!!!!!!!!!!!!!!!');
		LogEvent('', '������ ������� (small_array.length) ����� �������: ' + small_array.length);
	}	
}
